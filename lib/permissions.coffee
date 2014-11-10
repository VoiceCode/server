@ownsDocument = (userId, doc) ->
  if userId?
    doc and doc.userId is userId
  else
    false

@adminOrOwnsDocument = (userId, doc) ->
  isAdminId(userId) or ownsDocument(userId, doc)

@ownsAssociated = (userId, objectId, objectCollection) ->
  if userId? and objectId? and objectCollection?
    d = Collections[objectCollection].findOne objectId
    d? and d.userId is userId
  else
    false

@adminOrOwnsAssociated = (userId, objectId, objectCollection) ->
  isAdminId(userId) or ownsAssociated(userId, objectId, objectCollection)

@isAdmin = () ->
  Roles.userIsInRole(Meteor.user(), ['admin'])

@isAdminId = (userId) ->
  if userId?
    user = Meteor.users.findOne(_id: userId)
    Roles.userIsInRole(user, ['admin'])
  else
    false

@meOrAdmin = (userId) ->
  isAdmin() or userId is Meteor.userId()