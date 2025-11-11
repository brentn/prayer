import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { selectAllLists } from '../../store/lists/list.selectors';
import { selectAllTopics } from '../../store/topics/topic.selectors';
import { selectAllRequests } from '../../store/requests/request.selectors';
import { PrayerStats } from './prayer-stats';

export interface ExportData {
    version: string;
    exportDate: string;
    lists: any[];
    topics: any[];
    requests: any[];
    stats?: any;
}

export interface ImportOptions {
    includeRequests: boolean;
    includeStats: boolean;
    mergeMode: 'replace' | 'merge';
}

@Injectable({
    providedIn: 'root',
})
export class ImportExportService {
    private store = inject(Store);
    private prayerStats = inject(PrayerStats);

    exportAllData(): ExportData {
        const lists = this.store.selectSignal(selectAllLists)();
        const topics = this.store.selectSignal(selectAllTopics)();
        const requests = this.store.selectSignal(selectAllRequests)();

        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            lists,
            topics,
            requests,
            stats: {
                totalTimePrayed: this.prayerStats.getTotalTimePrayed(),
                totalRequestsPrayed: this.prayerStats.getTotalRequestsPrayed(),
                totalRequestsAnswered: this.prayerStats.getTotalRequestsAnswered(),
                totalSessions: this.prayerStats.getTotalSessions(),
                firstSessionDate: this.prayerStats.getFirstSessionDate(),
                lastSessionDate: this.prayerStats.getLastSessionDate(),
            },
        };
    }

    exportListData(listId: number): ExportData | null {
        const lists = this.store.selectSignal(selectAllLists)();
        const topics = this.store.selectSignal(selectAllTopics)();
        const requests = this.store.selectSignal(selectAllRequests)();

        const targetList = lists.find(list => list.id === listId);
        if (!targetList) return null;

        const listTopics = topics.filter(topic => targetList.topicIds?.includes(topic.id));
        const topicIds = listTopics.map(topic => topic.id);
        const listRequests = requests.filter(request =>
            listTopics.some(topic => topic.requestIds?.includes(request.id))
        );

        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            lists: [targetList],
            topics: listTopics,
            requests: listRequests,
        };
    }

    exportTopicData(topicId: number): ExportData | null {
        const topics = this.store.selectSignal(selectAllTopics)();
        const requests = this.store.selectSignal(selectAllRequests)();

        const targetTopic = topics.find(topic => topic.id === topicId);
        if (!targetTopic) return null;

        const topicRequests = requests.filter(request =>
            targetTopic.requestIds?.includes(request.id)
        );

        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            lists: [],
            topics: [targetTopic],
            requests: topicRequests,
        };
    }

    downloadData(data: ExportData, filename: string): void {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async importData(data: ExportData, options: ImportOptions): Promise<void> {
        // Handle replace mode - simple replacement with original IDs
        if (options.mergeMode === 'replace') {
            await this.importReplaceMode(data, options);
            return;
        }

        // Handle merge mode - existing logic
        await this.importMergeMode(data, options);
    }

    private async importReplaceMode(data: ExportData, options: ImportOptions): Promise<void> {
        // Clear all existing data
        const { clearLists } = await import('../../store/lists/list.actions');
        const { clearTopics } = await import('../../store/topics/topic.actions');
        const { clearRequests } = await import('../../store/requests/request.actions');

        this.store.dispatch(clearLists());
        this.store.dispatch(clearTopics());
        this.store.dispatch(clearRequests());
        this.prayerStats.resetStats();

        // Import lists with original IDs
        if (data.lists && data.lists.length > 0) {
            const { addListWithId } = await import('../../store/lists/list.actions');
            for (const list of data.lists) {
                this.store.dispatch(addListWithId({
                    id: list.id,
                    name: list.name,
                    topicIds: list.topicIds || [],
                    excludeFromAll: list.excludeFromAll || false
                }));
            }
        }

        // Import topics with original IDs
        if (data.topics && data.topics.length > 0) {
            const { addTopicWithId, updateTopic } = await import('../../store/topics/topic.actions');
            for (const topic of data.topics) {
                this.store.dispatch(addTopicWithId({
                    id: topic.id,
                    name: topic.name
                }));
                // Update with requestIds if they exist
                if (topic.requestIds && topic.requestIds.length > 0) {
                    this.store.dispatch(updateTopic({
                        id: topic.id,
                        changes: { requestIds: topic.requestIds }
                    }));
                }
            }
        }

        // Import requests with original IDs
        if (data.requests && data.requests.length > 0) {
            const { addRequestWithId, updateRequest } = await import('../../store/requests/request.actions');
            for (const request of data.requests) {
                this.store.dispatch(addRequestWithId({
                    id: request.id,
                    description: request.description || request.text || ''
                }));

                // Update with additional properties
                const changes: any = {};
                if (request.answeredDate !== undefined) changes.answeredDate = request.answeredDate;
                if (request.answerDescription !== undefined) changes.answerDescription = request.answerDescription;
                if (request.prayerCount !== undefined) changes.prayerCount = request.prayerCount || 0;
                if (request.priority !== undefined) changes.priority = request.priority || 1;
                if (request.archived !== undefined) changes.archived = request.archived || false;
                if (request.createdDate !== undefined) changes.createdDate = request.createdDate;

                if (Object.keys(changes).length > 0) {
                    this.store.dispatch(updateRequest({
                        id: request.id,
                        changes
                    }));
                }
            }
        }

        // Import stats if option is enabled
        if (options.includeStats && data.stats) {
            this.prayerStats.setAllStats(data.stats);
        }
    }

    private async importMergeMode(data: ExportData, options: ImportOptions): Promise<void> {
        const idMappings = {
            lists: new Map<number, number>(), // oldId -> newId
            topics: new Map<number, number>(), // oldId -> newId
            requests: new Map<number, number>(), // oldId -> newId
        };

        // Import lists - match by name, generate new IDs
        if (data.lists && data.lists.length > 0) {
            const { addList, updateList } = await import('../../store/lists/list.actions');
            const currentLists = this.store.selectSignal(selectAllLists)();

            for (const importedList of data.lists) {
                const existingList = currentLists.find(l => l.name === importedList.name);

                if (existingList) {
                    // Update existing list
                    this.store.dispatch(updateList({
                        id: existingList.id,
                        changes: {
                            excludeFromAll: importedList.excludeFromAll
                            // Note: topicIds will be rebuilt later
                        }
                    }));
                    // Map old ID to existing ID
                    idMappings.lists.set(importedList.id, existingList.id);
                } else {
                    // Add new list with new ID
                    const nextId = currentLists.length ? Math.max(...currentLists.map(l => l.id)) + 1 : 1;
                    this.store.dispatch(addList({ name: importedList.name }));

                    // Update excludeFromAll if needed
                    if (importedList.excludeFromAll) {
                        // Wait for the list to be added, then update
                        setTimeout(() => {
                            const newLists = this.store.selectSignal(selectAllLists)();
                            const newList = newLists.find(l => l.name === importedList.name);
                            if (newList) {
                                this.store.dispatch(updateList({
                                    id: newList.id,
                                    changes: { excludeFromAll: true }
                                }));
                            }
                        }, 0);
                    }

                    idMappings.lists.set(importedList.id, nextId);
                }
            }
        }

        // Import topics - import all topics from the data, generate new IDs
        if (data.topics && data.topics.length > 0) {
            const { addTopicWithId, updateTopic } = await import('../../store/topics/topic.actions');
            const currentTopics = this.store.selectSignal(selectAllTopics)();
            const currentLists = this.store.selectSignal(selectAllLists)();

            for (const importedTopic of data.topics) {
                const existingTopic = currentTopics.find(t => t.name === importedTopic.name);

                let topicId: number;
                if (existingTopic) {
                    // Update existing topic
                    // Note: requestIds will be rebuilt later
                    this.store.dispatch(updateTopic({
                        id: existingTopic.id,
                        changes: { name: importedTopic.name }
                    }));
                    topicId = existingTopic.id;
                } else {
                    // Add new topic with new ID
                    const nextId = currentTopics.length ? Math.max(...currentTopics.map(t => t.id)) + 1 : 1;
                    this.store.dispatch(addTopicWithId({ id: nextId, name: importedTopic.name }));
                    topicId = nextId;
                }

                // Map old ID to new ID
                idMappings.topics.set(importedTopic.id, topicId);
            }

            // Now associate topics with lists based on the imported list's topicIds
            if (data.lists && data.lists.length > 0) {
                for (const importedList of data.lists) {
                    const newListId = idMappings.lists.get(importedList.id);
                    if (newListId && importedList.topicIds) {
                        const targetList = currentLists.find(l => l.id === newListId);
                        if (targetList) {
                            // Map old topic IDs to new topic IDs for this list
                            const newTopicIds = importedList.topicIds
                                .map((oldTopicId: number) => idMappings.topics.get(oldTopicId))
                                .filter((id: number | undefined) => id !== undefined) as number[];

                            if (newTopicIds.length > 0) {
                                const { updateList } = await import('../../store/lists/list.actions');
                                this.store.dispatch(updateList({ id: targetList.id, changes: { topicIds: newTopicIds } }));
                            }
                        }
                    }
                }
            }
        }

        // Import requests if option is enabled - match by description and topic relationship, generate new IDs
        if (options.includeRequests && data.requests && data.requests.length > 0) {
            const { addRequestWithId, updateRequest } = await import('../../store/requests/request.actions');
            const currentRequests = this.store.selectSignal(selectAllRequests)();
            const currentTopics = this.store.selectSignal(selectAllTopics)();

            for (const importedRequest of data.requests) {
                // Find which topic contained this request in the imported data
                const importedTopic = data.topics?.find(topic => topic.requestIds?.includes(importedRequest.id));
                const newTopicId = importedTopic ? idMappings.topics.get(importedTopic.id) : undefined;

                if (!newTopicId) continue; // Skip requests whose topics weren't imported

                // Find requests that belong to the same topic
                const topicRequests = currentRequests.filter(r => {
                    const requestTopic = currentTopics.find(t => t.requestIds?.includes(r.id));
                    return requestTopic?.id === newTopicId;
                });

                const existingRequest = topicRequests.find(r =>
                    r.description === (importedRequest.description || importedRequest.text)
                );

                if (existingRequest) {
                    // Update existing request
                    this.store.dispatch(updateRequest({
                        id: existingRequest.id,
                        changes: {
                            description: importedRequest.description || importedRequest.text || '',
                            answeredDate: importedRequest.answeredDate,
                            answerDescription: importedRequest.answerDescription,
                            prayerCount: importedRequest.prayerCount,
                            priority: importedRequest.priority
                        }
                    }));
                    // Map old ID to existing ID
                    idMappings.requests.set(importedRequest.id, existingRequest.id);
                } else {
                    // Add new request with new ID
                    const nextId = currentRequests.length ? Math.max(...currentRequests.map(r => r.id)) + 1 : 1;
                    this.store.dispatch(addRequestWithId({
                        id: nextId,
                        description: importedRequest.description || importedRequest.text || ''
                    }));

                    // Update additional properties if they exist
                    if (importedRequest.answeredDate || importedRequest.prayerCount || importedRequest.priority !== undefined) {
                        this.store.dispatch(updateRequest({
                            id: nextId,
                            changes: {
                                answeredDate: importedRequest.answeredDate,
                                answerDescription: importedRequest.answerDescription,
                                prayerCount: importedRequest.prayerCount,
                                priority: importedRequest.priority
                            }
                        }));
                    }

                    // Link to topic
                    const targetTopic = currentTopics.find(t => t.id === newTopicId);
                    if (targetTopic) {
                        const requestIds = Array.from(new Set([...(targetTopic.requestIds || []), nextId]));
                        const { updateTopic } = await import('../../store/topics/topic.actions');
                        this.store.dispatch(updateTopic({ id: targetTopic.id, changes: { requestIds } }));
                    }

                    idMappings.requests.set(importedRequest.id, nextId);
                }
            }
        }

        // Import stats if option is enabled
        if (options.includeStats && data.stats) {
            // Merge stats (keep higher values)
            const currentStats = {
                totalTimePrayed: this.prayerStats.getTotalTimePrayed(),
                totalRequestsPrayed: this.prayerStats.getTotalRequestsPrayed(),
                totalRequestsAnswered: this.prayerStats.getTotalRequestsAnswered(),
                totalSessions: this.prayerStats.getTotalSessions(),
                firstSessionDate: this.prayerStats.getFirstSessionDate(),
                lastSessionDate: this.prayerStats.getLastSessionDate(),
            };

            const mergedStats = {
                totalTimePrayed: Math.max(currentStats.totalTimePrayed, data.stats.totalTimePrayed || 0),
                totalRequestsPrayed: Math.max(currentStats.totalRequestsPrayed, data.stats.totalRequestsPrayed || 0),
                totalRequestsAnswered: Math.max(currentStats.totalRequestsAnswered, data.stats.totalRequestsAnswered || 0),
                totalSessions: Math.max(currentStats.totalSessions, data.stats.totalSessions || 0),
                firstSessionDate: currentStats.firstSessionDate && data.stats.firstSessionDate
                    ? new Date(Math.min(new Date(currentStats.firstSessionDate).getTime(), new Date(data.stats.firstSessionDate).getTime())).toISOString()
                    : currentStats.firstSessionDate || data.stats.firstSessionDate,
                lastSessionDate: currentStats.lastSessionDate && data.stats.lastSessionDate
                    ? new Date(Math.max(new Date(currentStats.lastSessionDate).getTime(), new Date(data.stats.lastSessionDate).getTime())).toISOString()
                    : currentStats.lastSessionDate || data.stats.lastSessionDate,
            };

            this.prayerStats.setAllStats(mergedStats);
        }
    }
}
