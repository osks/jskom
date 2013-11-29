// Copyright (C) 2012 Oskar Skoog.

'use strict';

// ngSanitize is needed for bind-html, which we use in jskom:text-body.
angular.module('jskom.directives', ['jskom.services', 'ngSanitize']).
  directive('jskomLoading', [
    function() {
      return {
        restrict: 'E',
        replace: true,
        template: '<p><i class="icon-spinner icon-spin"></i> Loading...</p>',
      };
    }
  ]).
  directive('jskomDropdownToggle', [
    '$log', 'templatePath',
    function($log, templatePath) {
      var showDropdownClass = "show-dropdown";
      
      return {
        restrict: 'E',
        template: '<div ng-click="toggleDropdown($event)" ng-transclude></div>',
        transclude: true,
        replace: true,
        scope: true,
        link: function($scope, iElement, iAttrs) {
          var dropdown = iElement.find('ul.dropdown-menu');
          $scope.isOpen = false;
          
          $scope.toggleDropdown = function($event) {
            if ($scope.isOpen) {
              dropdown.removeClass(showDropdownClass);
              $scope.isOpen = false;
            } else {
              dropdown.addClass(showDropdownClass);
              $scope.isOpen = true;
            }
          };
        }
      };
    }
  ]).
  directive('jskomTopBar', [
    '$log', '$window', 'templatePath',
    function($log, $window, templatePath) {
      var getMenuHeight = function(element) {
        var total = 0;
        var count = 0;
        element.children('li:visible').each(function() {
          //$log.log("child: " + angular.element(this).outerHeight(true));
          total += angular.element(this).outerHeight(true);
          count += 1;
        });
        // For some reason the height isn't correct, this is a heuristic for fixing the height.
        var extra = 10 + ((count-1) * 3);
        return total + extra;
      };
      
      return {
        restrict: 'E',
        templateUrl: templatePath('topbar.html'),
        link: function($scope, iElement, iAttrs) {
          $scope.topbar = iElement.find('nav.top-bar');
          $scope.section = $scope.topbar.find('section');
          $scope.titleBar = $scope.topbar.children('ul:first');
          
          $scope.isTopBarExpanded = false;
          $scope.menuLevel = 0;
          $scope.activeMenu = null;
          
          var resetMenu = function() {
            $scope.activeMenu = null;
            $scope.menuLevel = 0; // only support for one sub menu yet
            $scope.topbar.css('min-height', '');
            $scope.topbar.css('height', '');
            $scope.topbar.find('section ul ul').each(function () {
              angular.element(this).css('height', '');
            });
          };
          
          $scope.isExpanded = function() {
            if ($scope.isTopBarExpanded) {
              return 'expanded';
            } else {
              return '';
            }
          };
          
          $scope.toggleExpanded = function($event) {
            //$log.log("jskomTopBar - toggleExpanded()");
            $event.stopPropagation();
            
            if ($scope.isTopBarExpanded) {
              $scope.unexpandTopBar();
            } else {
              $scope.isTopBarExpanded = true;
            }
          };
          
          $scope.unexpandTopBar = function() {
            //$log.log("jskomTopBar - unexpandTopBar()");
            $scope.isTopBarExpanded = false;
            resetMenu();
          };
          
          $scope.closeMenu = function($event) {
            //$log.log("jskomTopBar - closeMenu()");
            $event.stopPropagation();
            resetMenu();
          };
          
          $scope.openMenu = function($event, menu) {
            //$log.log("jskomTopBar - openMenu()");
            
            // Don't open unless expanded. We get clicks when in
            // non-mobile mode and then we don't want to do anything.
            if (!$scope.isExpanded()) {
              return;
            }
            
            $event.stopPropagation();
            $scope.activeMenu = menu;
            $scope.menuLevel = 1; // only support for one sub menu yet
            
            var target = angular.element($event.target);
            var selectedLi = target.closest('li');
            var dropdownUl = selectedLi.find('ul');
            //$log.log(selectedLi);
            
            var height = getMenuHeight(dropdownUl);
            var titleBarHeight = $scope.titleBar.outerHeight(true);
            
            //$log.log(height);
            //$log.log(titleBarHeight);
            //$log.log(height + titleBarHeight);
            
            //$log.log("outer height before: " + dropdownUl.outerHeight(true));
            dropdownUl.height(height);
            var outerHeight = dropdownUl.outerHeight(true);
            
            $scope.topbar.height(outerHeight + titleBarHeight);
          };
          
          $scope.isMenuOpen = function(menu) {
            if ($scope.activeMenu == menu) {
              return 'moved';
            } else {
              return '';
            }
          };

          angular.element($window).resize(function() {
            $scope.$apply(function() {
              if ($scope.isTopBarExpanded) {
                $scope.unexpandTopBar();
              }
            });
          });
        }
      };
    }
  ]).
  directive('jskomBindBody', [
    // Example:
    // <div jskom-bind-body="text.body"></div>
    
    '$log', 'htmlFormattingService',
    function($log, htmlFormattingService) {
      return {
        restrict: 'A',
        link: function(scope, iElement, iAttrs) {
          scope.$watch(iAttrs.jskomBindBody, function(value) {
            var str;
            if (!value) {
              str = "";
            }
            else if (_.isObject(value)) {
              str = angular.toJson(value);
            } else {
              str = value.toString();
            }
            var formattedBody = htmlFormattingService.formatBody(str);
            var templateHtml = angular.element('<p>' + formattedBody + '</p>');
            iElement.html(templateHtml);
          });
        }
      };
    }
  ]).
  directive('jskomBindLinkified', [
    // Example:
    // <span jskom-bind-linkified="text.body"></span>
    
    '$log', '$compile', 'htmlFormattingService',
    function($log, $compile, htmlFormattingService) {
      return {
        restrict: 'A',
        link: function(scope, iElement, iAttrs) {
          scope.$watch(iAttrs.jskomBindLinkified, function(value) {
            var str;
            if (!value) {
              str = "";
            }
            else if (_.isObject(value)) {
              str = angular.toJson(value);
            } else {
              str = value.toString();
            }
            var formattedBody = htmlFormattingService.linkifyLyskomLinks(str);
            var templateHtml = angular.element('<span>' + formattedBody + '</span>');
            $compile(templateHtml)(scope);
            iElement.html(templateHtml);
          });
        }
      };
    }
  ]).
  directive('jskomA', [
    // Examples:
    // <jskom:a text-no="{{ text.text_no }}">Text: {{text.text_no}}</jskom:a>
    // <jskom:a conf-no="{{ text.conf_no }}">Conference: {{text.conf_no}}</jskom:a>
    
    '$log', '$location', '$rootScope',
    function($log, $location, $rootScope) {
      var textEmit = 'jskom:a:text';
      var confEmit = 'jskom:a:conference';
      
      $rootScope.$on(textEmit, function($event, textNo, href) {
        //$log.log("on(jskom:a:text) - href - " + href);
        $event.stopPropagation();
        $location.url(href);
      });
      
      $rootScope.$on(confEmit, function($event, confNo, href) {
        //$log.log("on(jskom:a:conference) - href - " + href);
        $event.stopPropagation();
        $location.url(href);
      });
      
      return {
        restrict: 'E',
        replace: true,
        template: '<a ng-href="{{href}}" ng-click="click($event)" ng-transclude></a>',
        transclude: true,
        scope: {
          textNo: '@',
          confNo: '@'
        },
        link: function(scope, iElement, iAttrs) {
          scope.$watch('textNo', function(newValue) {
            if (newValue) {
              scope.href = '/texts/?text=' + newValue;
            }
          });
          
          scope.$watch('confNo', function(newValue) {
            if (newValue) {
              scope.href = '/conferences/' + newValue;
            }
          });
          
          scope.click = function($event) {
            if (!($event.ctrlKey || $event.altKey || $event.shiftKey || $event.metaKey)) {
              $event.stopPropagation();
              $event.preventDefault();
              
              //$log.log("jskomA - click() - iAttrs.href: " + iAttrs.href);
              
              if (scope.textNo) {
                scope.$emit(textEmit, scope.textNo, iAttrs.href);
              } else if (scope.confNo) {
                scope.$emit(confEmit, scope.confNo, iAttrs.href);
              }
            }
          };
        }
      };
    }
  ]).
  directive('jskomAutofocus', [
    '$log', 'modernizr',
    function($log, modernizr) {
      return {
        restrict: 'A',
        link: function(scope, iElement, iAttrs, controller) {
          var el = angular.element(iElement);
          //$log.log("touch: " + modernizr.touch);
          if (!modernizr.touch) {
            if (el.is('input') || el.is('textarea')) {
              el.focus();
            } else {
              el.find('input[type=text],textarea,select').filter(':visible:first').focus();
            }
          }
        }
      };
    }
  ]).
  directive('jskomConfInput', [
    // Example:
    // <jskom:conf-input model="session.person.pers_no" only-pers></jskom:conf-input>
    
    '$log', '$window', '$timeout',
    'templatePath', 'conferencesService', 'messagesService', 'sessionsService',
    function($log, $window, $timeout,
             templatePath, conferencesService, messagesService, sessionsService) {
      var errorMsgText = function(wantPers, wantConfs) {
        if (!wantPers) {
          return "conference";
        } else if (!wantConfs) {
          return "person";
        } else {
          return "conference or person";
        }
      };
      
      return {
        restrict: 'E',
        replace: true,
        templateUrl: templatePath('conf_input.html'),
        scope: {
          model: '=',
          conn: '='
        },
        controller: [
          '$scope',
          function(scope) {
            scope.isLoading = false;
            // This function is because if we don't want to use
            // ng-show/ng-hide on an extra icon in the button. If we have
            // an extra icon, the width will be calculated wrong until
            // angular has done the processing, so the conf input
            // flickers.
            scope.getLoadingClass = function() {
              // FIXME: this is not used since we switched to zurb foundation
              if (scope.isLoading) {
                return 'icon-refresh';
              } else {
                return 'icon-search icon-white';
              }
            };
            
            scope.wantPers = true;
            scope.wantConfs = true;
            scope.disconnectOnClear = false; // Disconnect on clearMatching()
            
            scope.matches = [];
            scope.lookup = '';
            scope.conf = null;
            
            scope.$watch('model', function(newModel, oldModel) {
              //$log.log("<jskom:conf-input> - $watch(model) - new: " + newModel);
              //$log.log("<jskom:conf-input> - $watch(model) - old: " + oldModel);
              
              if (newModel) {
                if (newModel !== oldModel || scope.conf == null) {
                  var isModelInMatches = _.any(scope.matches, function (match) {
                    return match.conf_no === newModel;
                  });
                  //$log.log("<jskom:conf-input> - $watch(model) - isInMatches: " + isModelInMatches);
                  if (!isModelInMatches) {
                    // If the current set of matches doesn't include the new model
                    // it has probably been changed from the "outside" and we should
                    // do a new look-up. Assume it's a conf number.
                    scope.clearMatching();
                    scope.lookup = '#' + newModel;
                    scope.getConf();
                  }
                }
              } else {
                scope.clearMatching();
              }
            });
            
            scope.clearMatching = function() {
              function clear() {
                scope.conf = null;
                scope.matches = [];
              }
              
              if (scope.disconnectOnClear && scope.conn.isConnected()) {
                // If we're connected, disconnect and then clear (even if it failed).
                sessionsService.deleteSession(scope.conn, 0).then(clear, clear);
              } else {
                clear();
              }
            };
            
            scope.getConf = function() {
              if (scope.isLoading
                  || !(scope.lookup && scope.lookup.length > 0)
                  || scope.conf) {
                return;
              }
              
              scope.isLoading = true;
              conferencesService.lookupConferences(
                scope.conn, scope.lookup, scope.wantPers, scope.wantConfs).then(
                  function(conferences) {
                    $log.log("<jskom:conf-input> - lookupConferences(" + scope.lookup +
                             ") - success");
                    scope.isLoading = false;
                    scope.matches = conferences;
                    if (scope.matches.length > 0) {
                      scope.conf = scope.matches[0];
                      scope.model = scope.conf.conf_no;
                    } else {
                      scope.conf = null;
                      scope.model = null;
                      messagesService.showMessage('error', 'Could not find any ' +
                                                  errorMsgText(scope.wantPers, scope.wantConfs) +
                                                  ' with that name.');
                    }
                  },
                  function(response) {
                    $log.log("<jskom:conf-input> - lookupConferences(" + scope.lookup +
                             ") - error");
                    scope.isLoading = false;
                    messagesService.showMessage('error', 'Failed to lookup ' + 
                                                errorMsgText(scope.wantPers, scope.wantConfs) +
                                                '.', response.data);
                  });
            };
          }
        ],
        link: function(scope, iElement, iAttrs) {
          var lookupInputEl = iElement.find('.jskomConfInputLookup input');
          
          angular.element(lookupInputEl).bind('keydown', function(e) {
            if (e.keyCode == 13) {
              scope.getConf();
            }
          });
          
          lookupInputEl.bind('blur', function(e) {
            //$log.log("<jskom:conf-input> - .confInputLookupName - blur");
            scope.getConf();
          });
          
          if (('onlyPers' in iAttrs)) {
            scope.wantConfs = false;
          }
          if (('onlyConfs' in iAttrs)) {
            scope.wantPers = false;
          }

          if (('disconnectOnClear' in iAttrs)) {
            scope.disconnectOnClear = true;
          }
          
          if (('autofocus' in iAttrs)) {
            lookupInputEl.focus();
          }
        }
      };
    }
  ]);
