var plugin = require('./lib').default
module.exports = function(lib) {
  return function(){
    var visitor = plugin.apply(plugin, arguments).visitor
    return {
      visitor: {
        Program: function(){
          this.opts.importFrom = 'cycle-hmr/rx'
          visitor.Program.apply(this, arguments)
        }
      }
    }
  }
}