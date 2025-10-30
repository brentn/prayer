const NEW_CONTEXT_ID = 0;

export class List {
    id: number;
    name: string;
    topicIds: number[];

    constructor(context: Partial<List>) {
        if (!context.name) { throw new Error('Empty Context') }
        this.id = context.id ?? NEW_CONTEXT_ID;
        this.name = context.name;
        this.topicIds = context.topicIds ?? [];
    }
}