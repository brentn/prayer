import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { SettingsService } from '../shared/services/settings.service';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectAllLists } from '../store/lists/list.selectors';
import { selectAllTopics } from '../store/topics/topic.selectors';
import { selectAllRequests } from '../store/requests/request.selectors';
import { updateList, addListWithId } from '../store/lists/list.actions';
import { updateTopic, addTopicWithId } from '../store/topics/topic.actions';
import { updateRequest, addRequestWithId } from '../store/requests/request.actions';
import { addList } from '../store/lists/list.actions';

@Component({
    standalone: true,
    imports: [CommonModule, MatListModule, MatCheckboxModule, MatIconModule, MatButtonModule, MatDividerModule],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.css'
})
export class SettingsComponent {
    private settings = inject(SettingsService);
    private router = inject(Router);
    private store = inject(Store);

    keepAwake() { return this.settings.keepAwake(); }
    toggleKeepAwake(ev: any) { this.settings.setKeepAwake(!!ev.checked); }

    shuffleRequests() { return this.settings.shuffleRequests(); }
    toggleShuffleRequests(ev: any) { this.settings.setShuffleRequests(!!ev.checked); }

    close() { this.router.navigate(['/']); }

    cleanupData() {
        const lists = this.store.selectSignal(selectAllLists)();
        const topics = this.store.selectSignal(selectAllTopics)();
        const requests = this.store.selectSignal(selectAllRequests)();

        const topicIds = new Set(topics.map(t => t.id));
        const requestIds = new Set(requests.map(r => r.id));

        // Step 1: Remove orphaned topicIds from lists
        lists.forEach(list => {
            const cleanedTopicIds = (list.topicIds || []).filter(id => topicIds.has(id));
            if (cleanedTopicIds.length !== (list.topicIds || []).length) {
                this.store.dispatch(updateList({ id: list.id, changes: { topicIds: cleanedTopicIds } }));
            }
        });

        // Step 2: Remove orphaned requestIds from topics
        topics.forEach(topic => {
            const cleanedRequestIds = (topic.requestIds || []).filter(id => requestIds.has(id));
            if (cleanedRequestIds.length !== (topic.requestIds || []).length) {
                this.store.dispatch(updateTopic({ id: topic.id, changes: { requestIds: cleanedRequestIds } }));
            }
        });

        // Step 3: Find topics that belong to multiple lists
        const topicToLists = new Map<number, number[]>();
        lists.forEach(list => {
            (list.topicIds || []).forEach(topicId => {
                if (!topicToLists.has(topicId)) {
                    topicToLists.set(topicId, []);
                }
                topicToLists.get(topicId)!.push(list.id);
            });
        });

        // Step 4: Duplicate topics that belong to multiple lists
        topicToLists.forEach((listIds, topicId) => {
            if (listIds.length > 1) {
                const originalTopic = topics.find(t => t.id === topicId);
                if (!originalTopic) return;

                // Create duplicates for all lists except the first one
                for (let i = 1; i < listIds.length; i++) {
                    const newTopicId = Math.max(...topics.map(t => t.id)) + 1;
                    const newTopic = {
                        id: newTopicId,
                        name: originalTopic.name,
                        requestIds: [...(originalTopic.requestIds || [])]
                    };

                    this.store.dispatch(addTopicWithId({ id: newTopicId, name: newTopic.name }));

                    // Update the list to use the new topic ID
                    const list = lists.find(l => l.id === listIds[i]);
                    if (list) {
                        const updatedTopicIds = (list.topicIds || []).map(id => id === topicId ? newTopicId : id);
                        this.store.dispatch(updateList({ id: list.id, changes: { topicIds: updatedTopicIds } }));
                    }
                }
            }
        });

        // Step 5: Find requests that belong to multiple topics
        const requestToTopics = new Map<number, number[]>();
        topics.forEach(topic => {
            (topic.requestIds || []).forEach(requestId => {
                if (!requestToTopics.has(requestId)) {
                    requestToTopics.set(requestId, []);
                }
                requestToTopics.get(requestId)!.push(topic.id);
            });
        });

        // Step 6: Duplicate requests that belong to multiple topics
        requestToTopics.forEach((topicIds, requestId) => {
            if (topicIds.length > 1) {
                const originalRequest = requests.find(r => r.id === requestId);
                if (!originalRequest) return;

                // Create duplicates for all topics except the first one
                for (let i = 1; i < topicIds.length; i++) {
                    const newRequestId = Math.max(...requests.map(r => r.id)) + 1;

                    this.store.dispatch(addRequestWithId({
                        id: newRequestId,
                        description: originalRequest.description
                    }));

                    // Update the new request with all the original properties
                    this.store.dispatch(updateRequest({
                        id: newRequestId,
                        changes: {
                            priority: originalRequest.priority,
                            createdDate: originalRequest.createdDate,
                            answeredDate: originalRequest.answeredDate,
                            answerDescription: originalRequest.answerDescription,
                            archived: originalRequest.archived,
                            prayerCount: originalRequest.prayerCount
                        }
                    }));

                    // Update the topic to use the new request ID
                    const topic = topics.find(t => t.id === topicIds[i]);
                    if (topic) {
                        const updatedRequestIds = (topic.requestIds || []).map(id => id === requestId ? newRequestId : id);
                        this.store.dispatch(updateTopic({ id: topic.id, changes: { requestIds: updatedRequestIds } }));
                    }
                }
            }
        });

        // Step 7: Find requests that don't belong to any topic
        const allRequestIds = new Set(requests.map(r => r.id));
        const referencedRequestIds = new Set<number>();
        topics.forEach(topic => {
            (topic.requestIds || []).forEach(requestId => referencedRequestIds.add(requestId));
        });

        const orphanedRequestIds = Array.from(allRequestIds).filter(id => !referencedRequestIds.has(id));
        if (orphanedRequestIds.length > 0) {
            // Create a new topic for orphaned requests
            const orphanedTopicId = Math.max(...topics.map(t => t.id), 0) + 1;
            this.store.dispatch(addTopicWithId({
                id: orphanedTopicId,
                name: 'Orphaned Requests'
            }));

            // Add all orphaned requests to this topic
            this.store.dispatch(updateTopic({
                id: orphanedTopicId,
                changes: { requestIds: orphanedRequestIds }
            }));

            // Find a list to add this topic to, or create one
            let targetList = lists.find(l => l.name === 'Orphaned Topics');
            if (!targetList) {
                const orphanedListId = Math.max(...lists.map(l => l.id), 0) + 1;
                this.store.dispatch(addListWithId({
                    id: orphanedListId,
                    name: 'Orphaned Topics',
                    topicIds: [orphanedTopicId]
                }));
            } else {
                const updatedTopicIds = [...(targetList.topicIds || []), orphanedTopicId];
                this.store.dispatch(updateList({
                    id: targetList.id,
                    changes: { topicIds: updatedTopicIds }
                }));
            }
        }

        // Step 8: Find topics that don't belong to any list
        const allTopicIds = new Set(topics.map(t => t.id));
        const referencedTopicIds = new Set<number>();
        lists.forEach(list => {
            (list.topicIds || []).forEach(topicId => referencedTopicIds.add(topicId));
        });

        const orphanedTopicIds = Array.from(allTopicIds).filter(id => !referencedTopicIds.has(id));
        if (orphanedTopicIds.length > 0) {
            // Find or create the "Orphaned Topics" list
            let orphanedList = lists.find(l => l.name === 'Orphaned Topics');
            if (!orphanedList) {
                const orphanedListId = Math.max(...lists.map(l => l.id), 0) + 1;
                this.store.dispatch(addListWithId({
                    id: orphanedListId,
                    name: 'Orphaned Topics',
                    topicIds: orphanedTopicIds
                }));
            } else {
                const updatedTopicIds = [...(orphanedList.topicIds || []), ...orphanedTopicIds];
                this.store.dispatch(updateList({
                    id: orphanedList.id,
                    changes: { topicIds: updatedTopicIds }
                }));
            }
        }
    }
}
