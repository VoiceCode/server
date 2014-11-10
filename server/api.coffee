RESTstop.configure
  api_path: "grammar"

RESTstop.add "generate", ->
  console.log @params
  license = Licenses.findOne(identifier: @params.license)
  if license?
    COMMANDO.buildParser(@params.grammar, output: "source")
  else
    """
    (function(undefined){
    return {success: false, message: "not authorized"};
    })()
    """
