Router.configure
  layoutTemplate: 'Layout',

Router.onBeforeAction ->
  if !isAdmin()
    @render('Login')
  else
    @next()

Router.route '/licenses',
  template: 'Licenses'
  waitOn: ->
  	Meteor.subscribe "licenses"

Router.route '/login',
  layout: 'Login'
