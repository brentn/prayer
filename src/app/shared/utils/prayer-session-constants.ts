/**
 * Constants for the prayer session functionality
 */
export const PRAYER_SESSION_CONSTANTS = {
    /** Number of seconds a user must view a request card to register a prayer */
    REGISTER_SECONDS: 12,

    /** Default priority for new prayer requests */
    DEFAULT_PRIORITY: 1,

    /** Maximum time value (61 = unlimited) */
    MAX_TIME_VALUE: 61,

    /** Minimum time value in minutes */
    MIN_TIME_VALUE: 1,

    /** Maximum selectable count */
    MAX_SELECT_COUNT: 100,

    /** Minimum selectable count */
    MIN_SELECT_COUNT: 1,

    /** Debounce delay for carousel measurements in milliseconds */
    CAROUSEL_MEASURE_DEBOUNCE_MS: 50,

    /** Transition duration for carousel in milliseconds */
    CAROUSEL_TRANSITION_MS: 120,
} as const;