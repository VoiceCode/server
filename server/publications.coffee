Meteor.publish 'licenses', -> 
  if isAdminId(@userId)
    Licenses.find()
  else
    @ready()
