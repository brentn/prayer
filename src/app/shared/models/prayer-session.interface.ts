import { EventEmitter } from '@angular/core';

export type PrayerSessionItem = {
    kind: 'request';
    id: number;
    description: string;
    listName?: string;
    topicName?: string;
    createdDate?: string;
    prayerCount?: number;
    priority?: number;
    isAnswered?: boolean;
    answeredDate?: string;
    answerDescription?: string;
} | {
    kind: 'topic';
    id: number;
    name: string;
    listName?: string;
};

export interface PrayerSessionInputs {
    listId?: number;
    fullScreen?: boolean;
}

export interface PrayerSessionOutputs {
    close: EventEmitter<void>;
}

export interface CarouselState {
    currentIndex: number;
    isDragging: boolean;
    deltaX: number;
    containerWidth: number;
    slideWidth: number;
    stepSize: number;
    viewportHeight: number;
}

export interface TimerState {
    countdownSeconds: number;
    initialCountdownSeconds: number;
    countdownStarted: boolean;
    unlimited: boolean;
    timeMinutes: number;
}