const NEW_TOPIC_ID = 0;

export class Topic {
    id: number;
    name: string;
    requestIds: number[];

    constructor(topic: Partial<Topic>) {
        if (!topic.name) { throw new Error('Empty Topic') }
        this.id = topic.id ?? NEW_TOPIC_ID;
        this.name = topic.name;
        this.requestIds = topic.requestIds ?? [];
    }
}