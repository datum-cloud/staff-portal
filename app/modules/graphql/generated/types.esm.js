export default {
    "scalars": [
        1,
        3,
        8,
        9
    ],
    "types": {
        "Query": {
            "serviceConsumers": [
                7,
                {
                    "producerProject": [
                        1,
                        "ID!"
                    ]
                }
            ],
            "sessions": [
                5,
                {
                    "userID": [
                        1
                    ]
                }
            ],
            "contactGroupMembershipsWithContacts": [
                13,
                {
                    "fieldSelector": [
                        3
                    ],
                    "limit": [
                        9
                    ],
                    "cursor": [
                        3
                    ]
                }
            ],
            "contactMembershipsWithGroups": [
                16,
                {
                    "fieldSelector": [
                        3
                    ],
                    "limit": [
                        9
                    ],
                    "cursor": [
                        3
                    ]
                }
            ],
            "userSummaries": [
                17,
                {
                    "names": [
                        3,
                        "[String!]!"
                    ]
                }
            ],
            "__typename": [
                3
            ]
        },
        "ID": {},
        "ParsedUserAgent": {
            "browser": [
                3
            ],
            "os": [
                3
            ],
            "formatted": [
                3
            ],
            "__typename": [
                3
            ]
        },
        "String": {},
        "GeoLocation": {
            "city": [
                3
            ],
            "country": [
                3
            ],
            "countryCode": [
                3
            ],
            "formatted": [
                3
            ],
            "__typename": [
                3
            ]
        },
        "ExtendedSession": {
            "id": [
                3
            ],
            "userUID": [
                3
            ],
            "provider": [
                3
            ],
            "ipAddress": [
                3
            ],
            "fingerprintID": [
                3
            ],
            "createdAt": [
                3
            ],
            "lastUpdatedAt": [
                3
            ],
            "userAgent": [
                2
            ],
            "location": [
                4
            ],
            "__typename": [
                3
            ]
        },
        "ConsumerProject": {
            "name": [
                3
            ],
            "displayName": [
                3
            ],
            "__typename": [
                3
            ]
        },
        "ServiceConsumer": {
            "name": [
                3
            ],
            "serviceName": [
                3
            ],
            "phase": [
                3
            ],
            "approvalDecision": [
                3
            ],
            "approvalMessage": [
                3
            ],
            "requestedAt": [
                3
            ],
            "consumerProject": [
                6
            ],
            "__typename": [
                3
            ]
        },
        "Boolean": {},
        "Int": {},
        "ContactRef": {
            "name": [
                3
            ],
            "namespace": [
                3
            ],
            "__typename": [
                3
            ]
        },
        "EnrichedContact": {
            "name": [
                3
            ],
            "namespace": [
                3
            ],
            "email": [
                3
            ],
            "givenName": [
                3
            ],
            "familyName": [
                3
            ],
            "displayName": [
                3
            ],
            "__typename": [
                3
            ]
        },
        "ContactGroupMembershipEnriched": {
            "name": [
                3
            ],
            "contactRef": [
                10
            ],
            "contact": [
                11
            ],
            "__typename": [
                3
            ]
        },
        "EnrichedContactGroupMembershipList": {
            "items": [
                12
            ],
            "continue": [
                3
            ],
            "__typename": [
                3
            ]
        },
        "EnrichedContactGroup": {
            "name": [
                3
            ],
            "namespace": [
                3
            ],
            "displayName": [
                3
            ],
            "__typename": [
                3
            ]
        },
        "ContactMembershipEnriched": {
            "name": [
                3
            ],
            "contactGroupRef": [
                10
            ],
            "contactGroup": [
                14
            ],
            "__typename": [
                3
            ]
        },
        "EnrichedContactMembershipList": {
            "items": [
                15
            ],
            "continue": [
                3
            ],
            "__typename": [
                3
            ]
        },
        "UserSummary": {
            "name": [
                3
            ],
            "email": [
                3
            ],
            "givenName": [
                3
            ],
            "familyName": [
                3
            ],
            "__typename": [
                3
            ]
        }
    }
}
