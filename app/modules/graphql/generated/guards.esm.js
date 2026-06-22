var Query_possibleTypes = ['Query'];
export var isQuery = function (obj) {
  if (!obj || !obj.__typename) throw new Error('__typename is missing in "isQuery"');
  return Query_possibleTypes.includes(obj.__typename);
};

var ParsedUserAgent_possibleTypes = ['ParsedUserAgent'];
export var isParsedUserAgent = function (obj) {
  if (!obj || !obj.__typename) throw new Error('__typename is missing in "isParsedUserAgent"');
  return ParsedUserAgent_possibleTypes.includes(obj.__typename);
};

var GeoLocation_possibleTypes = ['GeoLocation'];
export var isGeoLocation = function (obj) {
  if (!obj || !obj.__typename) throw new Error('__typename is missing in "isGeoLocation"');
  return GeoLocation_possibleTypes.includes(obj.__typename);
};

var ExtendedSession_possibleTypes = ['ExtendedSession'];
export var isExtendedSession = function (obj) {
  if (!obj || !obj.__typename) throw new Error('__typename is missing in "isExtendedSession"');
  return ExtendedSession_possibleTypes.includes(obj.__typename);
};

var ConsumerProject_possibleTypes = ['ConsumerProject'];
export var isConsumerProject = function (obj) {
  if (!obj || !obj.__typename) throw new Error('__typename is missing in "isConsumerProject"');
  return ConsumerProject_possibleTypes.includes(obj.__typename);
};

var ServiceConsumer_possibleTypes = ['ServiceConsumer'];
export var isServiceConsumer = function (obj) {
  if (!obj || !obj.__typename) throw new Error('__typename is missing in "isServiceConsumer"');
  return ServiceConsumer_possibleTypes.includes(obj.__typename);
};
