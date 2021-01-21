angular.module('jskom.templates', []).
  provider('templatePath', function() {
    var version = null;
    var urlPrefix = '';
    
    this.setUrlPrefix = function(newUrlPrefix) {
      urlPrefix = newUrlPrefix;
    };
    
    this.setVersion = function(newVersion) {
      version = newVersion;
    };
    
    var path = function(file) {
      var url = urlPrefix + file;
      if (version) {
        return url + '?_v=' + version;
      } else {
        return url;
      }
    };
    this.path = path;
    
    this.$get = function() {
      return function(file) {
        return path(file);
      }
    };
  }).
  filter('jskomTemplate', [
    'templatePath',
    function(templatePath) {
      return function(filename) {
        return templatePath(filename);
      };
    }
  ]);
