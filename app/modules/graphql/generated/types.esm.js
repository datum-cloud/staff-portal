export default {
  scalars: [1, 3, 8],
  types: {
    Query: {
      serviceConsumers: [
        7,
        {
          producerProject: [1, 'ID!'],
        },
      ],
      sessions: [
        5,
        {
          userID: [1],
        },
      ],
      __typename: [3],
    },
    ID: {},
    ParsedUserAgent: {
      browser: [3],
      os: [3],
      formatted: [3],
      __typename: [3],
    },
    String: {},
    GeoLocation: {
      city: [3],
      country: [3],
      countryCode: [3],
      formatted: [3],
      __typename: [3],
    },
    ExtendedSession: {
      id: [3],
      userUID: [3],
      provider: [3],
      ipAddress: [3],
      fingerprintID: [3],
      createdAt: [3],
      lastUpdatedAt: [3],
      userAgent: [2],
      location: [4],
      __typename: [3],
    },
    ConsumerProject: {
      name: [3],
      displayName: [3],
      __typename: [3],
    },
    ServiceConsumer: {
      name: [3],
      serviceName: [3],
      phase: [3],
      approvalDecision: [3],
      approvalMessage: [3],
      requestedAt: [3],
      consumerProject: [6],
      __typename: [3],
    },
    Boolean: {},
  },
};
