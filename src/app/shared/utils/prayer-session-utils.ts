import { PrayerSessionItem } from '../models/prayer-session.interface';
import { Topic } from '../models/topic';
import { List } from '../models/list';
import { RequestEntity } from '../../store/requests/request.reducer';
import { PRAYER_SESSION_CONSTANTS } from './prayer-session-constants';

/**
 * Creates a prayer session item for a request with proper typing and error handling
 */
export function createRequestItem(
    request: RequestEntity,
    ownerTopic?: Topic,
    ownerList?: List
): PrayerSessionItem {
    const baseItem = {
        kind: 'request' as const,
        id: request?.id || 0,
        description: request?.description || 'Unknown request',
        listName: ownerList?.name,
        topicName: ownerTopic?.name,
        createdDate: request?.createdDate,
        priority: Number(request?.priority) || PRAYER_SESSION_CONSTANTS.DEFAULT_PRIORITY,
        prayerCount: Number(request?.prayerCount) || 0
    };

    if (!request?.id || !request?.description) {
        console.warn('Invalid request data:', request);
        return baseItem;
    }

    return {
        ...baseItem,
        isAnswered: Boolean(request.answeredDate && !request.archived),
        answeredDate: request.answeredDate || undefined,
        answerDescription: request.answerDescription
    };
}

/**
 * Creates a prayer session item for a topic with proper typing and error handling
 */
export function createTopicItem(topic: Topic, ownerList?: List): PrayerSessionItem {
    if (!topic?.id || !topic?.name) {
        console.warn('Invalid topic data:', topic);
        return {
            kind: 'topic',
            id: topic?.id || 0,
            name: topic?.name || 'Unknown topic',
            listName: ownerList?.name
        };
    }

    return {
        kind: 'topic',
        id: topic.id,
        name: topic.name,
        listName: ownerList?.name
    };
}

/**
 * Calculates the score for a request based on priority and prayer count
 * Higher priority and lower prayer count = higher score
 */
export function calculateRequestScore(request: RequestEntity): number {
    const priority = Number(request.priority) || PRAYER_SESSION_CONSTANTS.DEFAULT_PRIORITY;
    const prayerCount = Number(request.prayerCount) || 0;
    return priority * 10 - prayerCount;
}

/**
 * Clamps a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
}