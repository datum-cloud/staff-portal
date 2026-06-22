export default {
    "scalars": [
        1,
        2,
        3,
        17
    ],
    "types": {
        "Query": {
            "serviceConsumers": [
                8,
                {
                    "producerProject": [
                        1,
                        "ID!"
                    ]
                }
            ],
            "sessions": [
                6,
                {
                    "userID": [
                        1
                    ]
                }
            ],
            "contactGroupMembershipsWithContacts": [
                14,
                {
                    "fieldSelector": [
                        2
                    ],
                    "limit": [
                        3
                    ],
                    "cursor": [
                        2
                    ]
                }
            ],
            "contactMembershipsWithGroups": [
                15,
                {
                    "fieldSelector": [
                        2
                    ],
                    "limit": [
                        3
                    ],
                    "cursor": [
                        2
                    ]
                }
            ],
            "userSummaries": [
                16,
                {
                    "names": [
                        2,
                        "[String!]!"
                    ]
                }
            ],
            "__typename": [
                2
            ]
        },
        "ID": {},
        "String": {},
        "Int": {},
        "ParsedUserAgent": {
            "browser": [
                2
            ],
            "os": [
                2
            ],
            "formatted": [
                2
            ],
            "__typename": [
                2
            ]
        },
        "GeoLocation": {
            "city": [
                2
            ],
            "country": [
                2
            ],
            "countryCode": [
                2
            ],
            "formatted": [
                2
            ],
            "__typename": [
                2
            ]
        },
        "ExtendedSession": {
            "id": [
                2
            ],
            "userUID": [
                2
            ],
            "provider": [
                2
            ],
            "ipAddress": [
                2
            ],
            "fingerprintID": [
                2
            ],
            "createdAt": [
                2
            ],
            "lastUpdatedAt": [
                2
            ],
            "userAgent": [
                4
            ],
            "location": [
                5
            ],
            "__typename": [
                2
            ]
        },
        "ConsumerProject": {
            "name": [
                2
            ],
            "displayName": [
                2
            ],
            "__typename": [
                2
            ]
        },
        "ServiceConsumer": {
            "name": [
                2
            ],
            "serviceName": [
                2
            ],
            "phase": [
                2
            ],
            "approvalDecision": [
                2
            ],
            "approvalMessage": [
                2
            ],
            "requestedAt": [
                2
            ],
            "consumerProject": [
                7
            ],
            "__typename": [
                2
            ]
        },
        "ContactRef": {
            "name": [
                2
            ],
            "namespace": [
                2
            ],
            "__typename": [
                2
            ]
        },
        "EnrichedContact": {
            "name": [
                2
            ],
            "namespace": [
                2
            ],
            "email": [
                2
            ],
            "givenName": [
                2
            ],
            "familyName": [
                2
            ],
            "displayName": [
                2
            ],
            "__typename": [
                2
            ]
        },
        "EnrichedContactGroup": {
            "name": [
                2
            ],
            "namespace": [
                2
            ],
            "displayName": [
                2
            ],
            "__typename": [
                2
            ]
        },
        "ContactGroupMembershipEnriched": {
            "name": [
                2
            ],
            "contactRef": [
                9
            ],
            "contact": [
                10
            ],
            "__typename": [
                2
            ]
        },
        "ContactMembershipEnriched": {
            "name": [
                2
            ],
            "contactGroupRef": [
                9
            ],
            "contactGroup": [
                11
            ],
            "__typename": [
                2
            ]
        },
        "EnrichedContactGroupMembershipList": {
            "items": [
                12
            ],
            "continue": [
                2
            ],
            "__typename": [
                2
            ]
        },
        "EnrichedContactMembershipList": {
            "items": [
                13
            ],
            "continue": [
                2
            ],
            "__typename": [
                2
            ]
        },
        "UserSummary": {
            "name": [
                2
            ],
            "email": [
                2
            ],
            "givenName": [
                2
            ],
            "familyName": [
                2
            ],
            "__typename": [
                2
            ]
        },
        "Boolean": {}
    }
}