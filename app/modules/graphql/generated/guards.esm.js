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

var ContactRef_possibleTypes = ['ContactRef'];
export var isContactRef = function (obj) {
  if (!obj || !obj.__typename) throw new Error('__typename is missing in "isContactRef"');
  return ContactRef_possibleTypes.includes(obj.__typename);
};

var EnrichedContact_possibleTypes = ['EnrichedContact'];
export var isEnrichedContact = function (obj) {
  if (!obj || !obj.__typename) throw new Error('__typename is missing in "isEnrichedContact"');
  return EnrichedContact_possibleTypes.includes(obj.__typename);
};

var EnrichedContactGroup_possibleTypes = ['EnrichedContactGroup'];
export var isEnrichedContactGroup = function (obj) {
  if (!obj || !obj.__typename) throw new Error('__typename is missing in "isEnrichedContactGroup"');
  return EnrichedContactGroup_possibleTypes.includes(obj.__typename);
};

var ContactGroupMembershipEnriched_possibleTypes = ['ContactGroupMembershipEnriched'];
export var isContactGroupMembershipEnriched = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error('__typename is missing in "isContactGroupMembershipEnriched"');
  return ContactGroupMembershipEnriched_possibleTypes.includes(obj.__typename);
};

var ContactMembershipEnriched_possibleTypes = ['ContactMembershipEnriched'];
export var isContactMembershipEnriched = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error('__typename is missing in "isContactMembershipEnriched"');
  return ContactMembershipEnriched_possibleTypes.includes(obj.__typename);
};

var EnrichedContactGroupMembershipList_possibleTypes = ['EnrichedContactGroupMembershipList'];
export var isEnrichedContactGroupMembershipList = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error('__typename is missing in "isEnrichedContactGroupMembershipList"');
  return EnrichedContactGroupMembershipList_possibleTypes.includes(obj.__typename);
};

var EnrichedContactMembershipList_possibleTypes = ['EnrichedContactMembershipList'];
export var isEnrichedContactMembershipList = function (obj) {
  if (!obj || !obj.__typename)
    throw new Error('__typename is missing in "isEnrichedContactMembershipList"');
  return EnrichedContactMembershipList_possibleTypes.includes(obj.__typename);
};

var UserSummary_possibleTypes = ['UserSummary'];
export var isUserSummary = function (obj) {
  if (!obj || !obj.__typename) throw new Error('__typename is missing in "isUserSummary"');
  return UserSummary_possibleTypes.includes(obj.__typename);
};
