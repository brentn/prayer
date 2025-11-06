import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class DateUtilsService {

    getTimeSpan(start: Date, end: Date): string {
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        const diffYears = Math.floor(diffDays / 365);

        if (diffYears > 0) {
            return diffYears === 1 ? '1 year' : `${diffYears} years`;
        } else if (diffMonths > 0) {
            return diffMonths === 1 ? '1 month' : `${diffMonths} months`;
        } else if (diffDays > 0) {
            return diffDays === 1 ? '1 day' : `${diffDays} days`;
        } else {
            return 'less than a day';
        }
    }

    formatAnsweredSummary(prayerCount: number | undefined, createdDate: string | undefined, answeredDate: string | undefined): string {
        if (!prayerCount || !createdDate || !answeredDate) {
            return '';
        }

        try {
            const created = new Date(createdDate);
            const answered = new Date(answeredDate);
            const timeSpan = this.getTimeSpan(created, answered);

            const countText = prayerCount === 1 ? '1 time' : `${prayerCount} times`;
            return `Prayed ${countText} over ${timeSpan}`;
        } catch (error) {
            console.error('Invalid date format:', error);
            return '';
        }
    }

    formatAnsweredDateText(isAnswered: boolean, answeredDate: string | undefined): string {
        if (!isAnswered || !answeredDate) return '';
        try {
            return `Answered ${new Date(answeredDate).toLocaleDateString()}`;
        } catch (error) {
            console.error('Invalid answered date:', error);
            return '';
        }
    }
}