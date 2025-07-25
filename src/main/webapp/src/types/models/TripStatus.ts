/* tslint:disable */
/* eslint-disable */
/**
 * TravelSync API
 * ## TravelSync API Documentation This API provides endpoints for managing travel itineraries, including creating, updating, and retrieving travel plans. 
 *
 * The version of the OpenAPI document: 1.0.0
 * Contact: pniecke@gmail.com
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */


/**
 * Status of the trip
 * @export
 */
export const TripStatus = {
    Planned: 'PLANNED',
    InProgress: 'IN_PROGRESS',
    Completed: 'COMPLETED',
    Cancelled: 'CANCELLED'
} as const;
export type TripStatus = typeof TripStatus[keyof typeof TripStatus];


export function TripStatusFromJSON(json: any): TripStatus {
    return TripStatusFromJSONTyped(json, false);
}

export function TripStatusFromJSONTyped(json: any, ignoreDiscriminator: boolean): TripStatus {
    return json as TripStatus;
}

export function TripStatusToJSON(value?: TripStatus | null): any {
    return value as any;
}

