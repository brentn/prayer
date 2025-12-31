import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAllRequests } from '../../store/requests/request.selectors';
import { Topic } from '../models/topic';
import { PrayerSessionItem } from '../models/prayer-session.interface';

/**
 * Service responsible for ordering and prioritizing prayer topics
 * Handles both weighted shuffling and priority-based sorting
 */
@Injectable({ providedIn: 'root' })
export class PrayerOrderingService {
    private readonly store = inject(Store);
    private readonly requests = this.store.selectSignal(selectAllRequests);

    /**
     * Calculate priority score for a topic based on its active requests
     * Score = sum of (priority - 1) for all active requests
     * Normal priority (1) requests contribute 0, higher priority requests contribute more
     */
    calculateTopicPriorityScore(topic: Topic): number {
        const allRequests = this.requests();
        let score = 0;

        for (const requestId of topic.requestIds || []) {
            const request = allRequests.find(r => r.id === requestId);
            // Only count active requests (not answered, not archived)
            if (request && !request.answeredDate && !request.archived) {
                const priority = request.priority ?? 1;
                score += Math.max(0, priority - 1);
            }
        }

        return score;
    }

    /**
     * Weighted shuffle that biases toward higher-priority topics
     * Uses weighted random selection without replacement
     * @param topicItems - Items to shuffle
     * @param topics - Full topic data for score calculation
     * @returns Shuffled array with higher-priority topics more likely to appear early
     */
    weightedShuffleTopics(topicItems: PrayerSessionItem[], topics: Topic[]): PrayerSessionItem[] {
        if (topicItems.length === 0) return [];

        // Build items with their weights (scores + 1 to ensure all have at least weight 1)
        const itemsWithWeights = topicItems.map(item => {
            const topic = topics.find(t => t.id === item.id);
            const score = topic ? this.calculateTopicPriorityScore(topic) : 0;
            // Add 1 to ensure even zero-score topics have a chance
            return { item, weight: score + 1 };
        });

        const result: PrayerSessionItem[] = [];
        const remaining = [...itemsWithWeights];

        // Weighted random selection without replacement
        while (remaining.length > 0) {
            const totalWeight = remaining.reduce((sum, x) => sum + x.weight, 0);
            let random = Math.random() * totalWeight;

            let selectedIndex = 0;
            for (let i = 0; i < remaining.length; i++) {
                random -= remaining[i].weight;
                if (random <= 0) {
                    selectedIndex = i;
                    break;
                }
            }

            result.push(remaining[selectedIndex].item);
            remaining.splice(selectedIndex, 1);
        }

        return result;
    }

    /**
     * Sort topics by priority score in descending order (highest priority first)
     * Secondary sort by topic ID for deterministic ordering when scores are equal
     * @param topicItems - Items to sort
     * @param topics - Full topic data for score calculation
     * @returns Sorted array with highest-priority topics first
     */
    sortTopicsByPriority(topicItems: PrayerSessionItem[], topics: Topic[]): PrayerSessionItem[] {
        if (topicItems.length === 0) return [];

        // Build items with their scores
        const itemsWithScores = topicItems.map(item => {
            const topic = topics.find(t => t.id === item.id);
            const score = topic ? this.calculateTopicPriorityScore(topic) : 0;
            return { item, score };
        });

        // Sort by score descending, then by ID ascending for deterministic order
        itemsWithScores.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score; // Higher score first
            }
            return a.item.id - b.item.id; // Then by ID
        });

        return itemsWithScores.map(x => x.item);
    }
}
