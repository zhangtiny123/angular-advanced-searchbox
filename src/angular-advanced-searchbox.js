/*! 
 * angular-advanced-searchbox
 * https://github.com/dnauck/angular-advanced-searchbox
 * Copyright (c) 2015 Nauck IT KG http://www.nauck-it.de/
 * Author: Daniel Nauck <d.nauck(at)nauck-it.de>
 * License: MIT
 */

(function() {

'use strict';

angular.module('angular-advanced-searchbox', [])
    .directive('nitAdvancedSearchbox', function() {
        return {
            restrict: 'E',
            scope: {
                model: '=ngModel',
                parameters: '=',
                placeholder: '@'
            },
            replace: true,
            templateUrl: 'angular-advanced-searchbox.html',
            controller: [
                '$scope', '$attrs', '$element', '$timeout', '$filter',
                function ($scope, $attrs, $element, $timeout, $filter) {

                    $scope.placeholder = $scope.placeholder || 'Search ...';
                    $scope.searchParams = [];
                    $scope.searchQuery = '';
                    $scope.setSearchFocus = false;
                    var searchThrottleTimer;
                    var changeBuffer = [];
                    var generator = new IDGenerator();

                    function IDGenerator() {

                        this.length = 8;
                        this.timestamp = +new Date();

                        var _getRandomInt = function( min, max ) {
                            return Math.floor( Math.random() * ( max - min + 1 ) ) + min;
                        };

                        this.generate = function() {
                            var ts = this.timestamp.toString();
                            var parts = ts.split( "" ).reverse();
                            var id = "";

                            for( var i = 0; i < this.length; ++i ) {
                                var index = _getRandomInt( 0, parts.length - 1 );
                                id += parts[index];
                            }

                            return id;
                        };
                    }

                    function updateModel2SearchParams() {
                        angular.forEach($scope.model, function (itemArray, key) {
                            if (key === 'query' && $scope.searchQuery !== itemArray[0]) {
                                $scope.searchQuery = itemArray[0];
                            } else {
                                var paramTemplate = $filter('filter')($scope.parameters, function (param) { return param.key === key; })[0];
                                var theSearchParams = $filter('filter')($scope.searchParams, function (param) { return param.key === key; });

                                if (paramTemplate !== undefined) {
                                    angular.forEach (itemArray, function(item) {
                                        var findResult = $filter('filter')(theSearchParams, function (param) {
                                            return param.id === item.id;
                                        })[0];
                                        if (findResult === undefined) {
                                            $scope.addSearchParam(paramTemplate, item, false);
                                        }
                                        else if (findResult !== undefined && findResult.value !== item.value) {
                                            findResult.value = item.value;
                                        }
                                    });
                                }
                            }
                        });
                    }

                    $scope.$watch('model', function (newValue, oldValue) {

                        if(angular.equals(newValue, oldValue))
                            return;

                        updateModel2SearchParams();

                        // delete not existing search parameters from internal state array
                        angular.forEach($scope.searchParams, function (value, key){
                            if (!$scope.model.hasOwnProperty(value.key)){
                                var index = $scope.searchParams.map(function(e) { return e.key; }).indexOf(value.key);
                                $scope.removeSearchParam(index);
                            }
                        });
                    }, true);

                    $scope.$watch('focus', function(newValue, oldValue) {
                        if (newValue === true){
                            var position = document.activeElement.getBoundingClientRect();
                            var grandPosition = document.activeElement.parentElement.parentElement.getBoundingClientRect();
                            document.getElementsByClassName('suggest-drop-down')[0].style.top = (grandPosition.height) + 'px';
                            document.getElementsByClassName('suggest-drop-down')[0].style.left = (position.left - grandPosition.left) + 'px';
                            document.getElementsByClassName('suggest-drop-down')[0].style.maxHeight = (window.innerHeight - position.height - 10) + 'px';
                        }
                    });

                    $scope.getMySuggestions = function(thisSearchParam, $viewValue) {
                        if (!$viewValue) {
                            return thisSearchParam.suggestions;
                        }
                        return $filter('filter')(thisSearchParam.suggestions, function (s) { return s.name.toLowerCase().indexOf($viewValue.toLowerCase()) !== 0; });
                    };

                    $scope.focusSearchBox = function() {
                        if($scope.focus) {
                            return;
                        }

                        $scope.setSearchFocus = true;
                    };

                    $scope.isActiveBox = function() {
                        var activeItems = $filter('filter')($scope.searchParams, function (param) { return param.editMode === true; });
                        return $scope.focus || activeItems.length !== 0;
                    };

                    $scope.searchParamValueChanged = function (param) {
                        updateModel('change', param);
                    };

                    $scope.searchQueryChanged = function (query) {
                        var queryParam = {
                            key: 'query',
                            value: query
                        };
                        updateModel('change', queryParam);
                    };

                    $scope.enterEditMode = function(index) {
                        if (index === undefined)
                            return;

                        var searchParam = $scope.searchParams[index];
                        searchParam.editMode = true;
                    };

                    $scope.leaveEditMode = function(index) {
                        if (index === undefined)
                            return;

                        var searchParam = $scope.searchParams[index];
                        searchParam.editMode = false;
                        updateModel('change', searchParam);

                        // remove empty search params
                        if (!searchParam.value)
                            $scope.removeSearchParam(index);
                    };

                    $scope.typeaheadOnSelect = function (item, model, label) {
                        $scope.addSearchParam(item);
                        $scope.searchQuery = '';
                        var dqParam = {
                            key: 'query',
                            value: null
                        };
                        updateModel('delete', dqParam);
                    };

                    $scope.addSearchParam = function (searchParam, value, enterEditModel) {
                        if (enterEditModel === undefined)
                            enterEditModel = true;

                        var newItem = {
                            id: generator.generate(),
                            key: searchParam.key,
                            name: searchParam.name,
                            placeholder: searchParam.placeholder,
                            value: value || '',
                            suggestions: searchParam.suggestions,
                            editMode: enterEditModel
                        };
                        $scope.searchParams.push(newItem);

                        updateModel('add', newItem);
                    };

                    $scope.removeSearchParam = function (index) {
                        if (index === undefined)
                            return;

                        var searchParam = $scope.searchParams[index];
                        $scope.searchParams.splice(index, 1);

                        updateModel('delete', searchParam);
                    };

                    $scope.removeAll = function() {
                        $scope.searchParams.length = 0;
                        $scope.searchQuery = '';
                        
                        $scope.model = {};
                    };

                    $scope.editPrevious = function(currentIndex) {
                        if (currentIndex !== undefined)
                            $scope.leaveEditMode(currentIndex);

                        //TODO: check if index == 0 -> what then?
                        if (currentIndex > 0) {
                            $scope.enterEditMode(currentIndex - 1);
                        } else if ($scope.searchParams.length > 0) {
                            $scope.enterEditMode($scope.searchParams.length - 1);
                        }
                    };

                    $scope.editNext = function(currentIndex) {
                        if (currentIndex === undefined)
                            return;

                        $scope.leaveEditMode(currentIndex);

                        //TODO: check if index == array length - 1 -> what then?
                        if (currentIndex < $scope.searchParams.length - 1) {
                            $scope.enterEditMode(currentIndex + 1);
                        } else {
                            $scope.setSearchFocus = true;
                        }
                    };

                    $scope.keydown = function(e, searchParamIndex) {
                        var handledKeys = [8, 9, 13, 37, 39];
                        if (handledKeys.indexOf(e.which) === -1)
                            return;

                        var cursorPosition = getCurrentCaretPosition(e.target);

                        if (e.which == 8) { // backspace
                            if (cursorPosition === 0)
                                $scope.editPrevious(searchParamIndex);

                        } else if (e.which == 9) { // tab
                            if (e.shiftKey) {
                                e.preventDefault();
                                $scope.editPrevious(searchParamIndex);
                            } else {
                                e.preventDefault();
                                $scope.editNext(searchParamIndex);
                            }

                        } else if (e.which == 13) { // enter
                            $scope.editNext(searchParamIndex);

                        } else if (e.which == 37) { // left
                            if (cursorPosition === 0)
                                $scope.editPrevious(searchParamIndex);

                        } else if (e.which == 39) { // right
                            if (cursorPosition === e.target.value.length)
                                $scope.editNext(searchParamIndex);
                        }
                    };

                    if ($scope.model === undefined) {
                        $scope.model = {};
                    } else {
                        updateModel2SearchParams();
                    }

                    function updateModel(command, searchParam) {
                        if (searchThrottleTimer)
                            $timeout.cancel(searchThrottleTimer);

                        // remove all previous entries to the same search key that was not handled yet
                        changeBuffer = $filter('filter')(changeBuffer, function (change) { return change.key !== searchParam.key; });
                        // add new change to list
                        changeBuffer.push({
                            command: command,
                            key: searchParam.key,
                            item: {
                                id: searchParam.id || null,
                                value: searchParam.value
                            }
                        });

                        searchThrottleTimer = $timeout(function () {
                            angular.forEach(changeBuffer, function (change) {
                                switch (change.command) {
                                    case 'delete':
                                        if (change.key === 'query') {
                                            $scope.model[change.key] = [];
                                        }
                                        else {
                                            $scope.model[change.key] = $filter('filter')($scope.model[change.key], function (i) { return i.id !== change.item.id; });
                                        }
                                        break;
                                    case 'add':
                                        if ($scope.model[change.key] === undefined) {
                                            $scope.model[change.key] = [];
                                        }
                                        $scope.model[change.key].push(change.item);
                                        break;
                                    case 'change':
                                        if (change.key === 'query') {
                                            $scope.model[change.key] = [];
                                            $scope.model[change.key].push(change.item.value);
                                        }
                                        else {
                                            var target = $filter('filter')($scope.model[change.key], function (i) { return i.id === change.item.id; })[0];
                                            if (target)
                                                target.value = change.item.value;
                                        }
                                }
                            });

                            changeBuffer.length = 0;
                        }, 10);
                    }

                    function getCurrentCaretPosition(input) {
                        if (!input)
                            return 0;

                        // Firefox & co
                        if (typeof input.selectionStart === 'number') {
                            return input.selectionDirection === 'backward' ? input.selectionStart : input.selectionEnd;

                        } else if (document.selection) { // IE
                            input.focus();
                            var selection = document.selection.createRange();
                            var selectionLength = document.selection.createRange().text.length;
                            selection.moveStart('character', -input.value.length);
                            return selection.text.length - selectionLength;
                        }

                        return 0;
                    }
                }
            ]
        };
    })
    .directive('nitSetFocus', [
        '$timeout', '$parse',
        function($timeout, $parse) {
            return {
                restrict: 'A',
                link: function($scope, $element, $attrs) {
                    var model = $parse($attrs.nitSetFocus);
                    $scope.$watch(model, function(value) {
                        if (value === true) {
                            $timeout(function() {
                                $element[0].focus();
                            });
                        }
                    });
                    $element.bind('blur', function() {
                        $scope.$apply(model.assign($scope, false));
                    });
                }
            };
        }
    ])
    .directive('nitSuggestionClickOpen', [
        '$parse', function($parse) {
            return {
                restrict: 'A',
                require: 'ngModel',
                link: function($scope, elem, attrs) {
                    var triggerFunc;
                    triggerFunc = function(evt) {
                        var ctrl, prev;
                        ctrl = elem.controller('ngModel');
                        prev = ctrl.$modelValue.key || '';
                        return ctrl.$setViewValue(prev ? '' : ' ');
                    };
                    return elem.bind('click', triggerFunc);
                }
            };
        }
    ])
    .directive('nitAutoSizeInput', [
        function() {
            return {
                restrict: 'A',
                scope: {
                    model: '=ngModel'
                },
                link: function($scope, $element, $attrs) {
                    var container = angular.element('<div style="position: fixed; top: -9999px; left: 0;"></div>');
                    var element = document.createElement('span');
                    element.style.whiteSpace = 'pre';

                    var maxWidth = $element.css('maxWidth') === 'none' ? $element.parent().innerWidth() : $element.css('maxWidth');
                    $element.css('maxWidth', maxWidth);

                    angular.forEach([
                        'fontSize', 'fontFamily', 'fontWeight', 'fontStyle',
                        'letterSpacing', 'textTransform', 'wordSpacing', 'textIndent',
                        'boxSizing', 'borderLeftWidth', 'borderRightWidth', 'borderLeftStyle', 'borderRightStyle',
                        'paddingLeft', 'paddingRight', 'marginLeft', 'marginRight'
                    ], function(css) {
                        element.style[css] = $element.css(css);
                    });

                    angular.element(document).find('body').append(container.append(element));

                    function resize() {
                        element.textContent = $element.val() || $element.attr('placeholder');
                        $element.css('width', element.offsetWidth + 10);
                    }

                    resize();

                    if ($scope.model) {
                        $scope.$watch('model', function() { resize(); });
                    } else {
                        $element.on('keypress keyup keydown focus input propertychange change', function() { resize(); });
                    }
                }
            };
        }
    ]);
})();
