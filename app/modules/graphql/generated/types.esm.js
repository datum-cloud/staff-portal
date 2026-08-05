export default {
    "scalars": [
        1,
        2,
        3,
        21
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
                16,
                {
                    "namespace": [
                        2
                    ],
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
                17,
                {
                    "namespace": [
                        2
                    ],
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
                18,
                {
                    "names": [
                        2,
                        "[String!]!"
                    ]
                }
            ],
            "organizations": [
                22,
                {
                    "limit": [
                        3
                    ],
                    "cursor": [
                        2
                    ],
                    "search": [
                        2
                    ]
                }
            ],
            "organization": [
                20,
                {
                    "name": [
                        2,
                        "String!"
                    ]
                }
            ],
            "organizationProjects": [
                24,
                {
                    "orgName": [
                        2,
                        "String!"
                    ],
                    "limit": [
                        3
                    ],
                    "cursor": [
                        2
                    ]
                }
            ],
            "organizationMembers": [
                25,
                {
                    "orgName": [
                        2,
                        "String!"
                    ]
                }
            ],
            "projects": [
                24,
                {
                    "limit": [
                        3
                    ],
                    "cursor": [
                        2
                    ],
                    "search": [
                        2
                    ]
                }
            ],
            "project": [
                23,
                {
                    "name": [
                        2,
                        "String!"
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
        "ContactGroupCondition": {
            "type": [
                2
            ],
            "status": [
                2
            ],
            "reason": [
                2
            ],
            "message": [
                2
            ],
            "lastTransitionTime": [
                2
            ],
            "observedGeneration": [
                3
            ],
            "__typename": [
                2
            ]
        },
        "EnrichedContactGroupStatus": {
            "conditions": [
                11
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
            "visibility": [
                2
            ],
            "status": [
                12
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
            "creationTimestamp": [
                2
            ],
            "contactGroupRef": [
                9
            ],
            "contactGroup": [
                13
            ],
            "__typename": [
                2
            ]
        },
        "EnrichedContactGroupMembershipList": {
            "items": [
                14
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
                15
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
        "OrgContactInfo": {
            "businessName": [
                2
            ],
            "name": [
                2
            ],
            "email": [
                2
            ],
            "__typename": [
                2
            ]
        },
        "Organization": {
            "name": [
                2
            ],
            "displayName": [
                2
            ],
            "type": [
                2
            ],
            "createdAt": [
                2
            ],
            "state": [
                2
            ],
            "contactInfo": [
                19
            ],
            "onboardingComplete": [
                21
            ],
            "onboardingReason": [
                2
            ],
            "onboardingMessage": [
                2
            ],
            "members": [
                25
            ],
            "projects": [
                24,
                {
                    "limit": [
                        3
                    ],
                    "cursor": [
                        2
                    ]
                }
            ],
            "__typename": [
                2
            ]
        },
        "Boolean": {},
        "OrganizationList": {
            "items": [
                20
            ],
            "continueToken": [
                2
            ],
            "__typename": [
                2
            ]
        },
        "Project": {
            "name": [
                2
            ],
            "displayName": [
                2
            ],
            "organizationName": [
                2
            ],
            "organizationDisplayName": [
                2
            ],
            "organizationBusinessName": [
                2
            ],
            "hasActiveBillingAccount": [
                21
            ],
            "billingAccountName": [
                2
            ],
            "createdAt": [
                2
            ],
            "state": [
                2
            ],
            "__typename": [
                2
            ]
        },
        "ProjectList": {
            "items": [
                23
            ],
            "continueToken": [
                2
            ],
            "__typename": [
                2
            ]
        },
        "OrgMember": {
            "name": [
                2
            ],
            "givenName": [
                2
            ],
            "familyName": [
                2
            ],
            "email": [
                2
            ],
            "roles": [
                2
            ],
            "type": [
                2
            ],
            "invitationState": [
                2
            ],
            "createdAt": [
                2
            ],
            "userName": [
                2
            ],
            "avatarUrl": [
                2
            ],
            "__typename": [
                2
            ]
        }
    }
}