package com.housing.oth_nest.validation;

/**
 * Input limits used by the request DTOs.
 * Keep in sync with LIMITS in frontend/src/app/utils/validation.ts, both sides must accept the same values.
 */
public final class ValidationLimits {

    private ValidationLimits() {
    }

    public static final int NAME_MIN = 3;
    public static final int NAME_MAX = 100;
    public static final int ADDRESS_MIN = 5;
    public static final int ADDRESS_MAX = 200;
    public static final int AREA_MIN = 5;
    public static final String AREA_MAX = "1000";
    public static final String MONTHLY_PRICE_MAX = "10000";
    public static final String TOTAL_PRICE_MAX = "20000"; //kaltmiete + nebenkosten
    public static final String ONE_TIME_PRICE_MAX = "50000";
    public static final int OCCUPANTS_MAX = 20;
    public static final int YEARS_AHEAD_MAX = 2;
    public static final int DESCRIPTION_MIN = 20;
    public static final int DESCRIPTION_MAX = 1000; //apartment.description column length
    public static final int PHOTOS_COUNT_MAX = 8;
    public static final long PHOTO_SIZE_MAX = 1024 * 1024; //spring.servlet.multipart.max-file-size
    public static final int APPLICATION_MESSAGE_MIN = 20;
    public static final int APPLICATION_MESSAGE_MAX = 2000;
    public static final int DECLINE_MESSAGE_MAX = 500;
    public static final int CHAT_MESSAGE_MAX = 2000;

    public static final String CONTAINS_LETTER = "(?s).*\\p{L}.*";
    public static final String CONTAINS_LETTER_AND_DIGIT = "(?s)(?=.*\\p{L})(?=.*\\d).*";
    public static final String PERMISSION = "allowed|not-allowed|maybe";
    public static final String OTH_EMAIL = "(?i)[^\\s@]+@([a-z0-9-]+\\.)*oth-regensburg\\.de";
}
