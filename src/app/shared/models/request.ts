const NEW_REQUEST_ID = 0;

export class Request {
    id: number;
    description: string;
    createdDate: Date;
    answeredDate?: Date;
    answerDescription?: string;
    prayerCount: number;
    archived?: boolean;
    priority: number; // 1 (low) to 5 (high)

    constructor(request: Partial<Request>) {
        if (!request.description) { throw new Error('Empty Request') }
        this.id = request.id ?? NEW_REQUEST_ID;
        this.description = request.description;
        this.createdDate = request.createdDate ?? new Date();
        this.answeredDate = request.answeredDate;
        this.answerDescription = request.answerDescription;
        this.archived = request.archived ?? false;
        this.prayerCount = request.prayerCount ?? 0;
        this.priority = request.priority ?? 1;
    }
}