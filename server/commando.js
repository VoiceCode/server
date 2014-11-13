COMMANDO = (function(undefined) {
  var modules = {
    define: function(name, factory) {
      var dir    = name.replace(/(^|\/)[^/]+$/, "$1"),
          module = { exports: {} };

      function require(path) {
        var name   = dir + path,
            regexp = /[^\/]+\/\.\.\/|\.\//;

        while (regexp.test(name)) {
          name = name.replace(regexp, "");
        }

        return modules[name];
      }

      factory(module, require);
      this[name] = module.exports;
    }
  };

  modules.define("utils", function(module, require) {
    var utils = {
      range: function(start, stop) {
        if (stop === undefined) {
          stop = start;
          start = 0;
        }
    
        var result = new Array(Math.max(0, stop - start));
        for (var i = 0, j = start; j < stop; i++, j++) {
          result[i] = j;
        }
        return result;
      },
    
      find: function(array, callback) {
        var length = array.length;
        for (var i = 0; i < length; i++) {
          if (callback(array[i])) {
            return array[i];
          }
        }
      },
    
      indexOf: function(array, callback) {
        var length = array.length;
        for (var i = 0; i < length; i++) {
          if (callback(array[i])) {
            return i;
          }
        }
        return -1;
      },
    
      contains: function(array, value) {
        var length = array.length;
        for (var i = 0; i < length; i++) {
          if (array[i] === value) {
            return true;
          }
        }
        return false;
      },
    
      each: function(array, callback) {
        var length = array.length;
        for (var i = 0; i < length; i++) {
          callback(array[i], i);
        }
      },
    
      map: function(array, callback) {
        var result = [];
        var length = array.length;
        for (var i = 0; i < length; i++) {
          result[i] = callback(array[i], i);
        }
        return result;
      },
    
      pluck: function(array, key) {
        return utils.map(array, function (e) { return e[key]; });
      },
    
      keys: function(object) {
        var result = [];
        for (var key in object) {
          if (object.hasOwnProperty(key)) {
            result.push(key);
          }
        }
        return result;
      },
    
      values: function(object) {
        var result = [];
        for (var key in object) {
          if (object.hasOwnProperty(key)) {
            result.push(object[key]);
          }
        }
        return result;
      },
    
      clone: function(object) {
        var result = {};
        for (var key in object) {
          if (object.hasOwnProperty(key)) {
            result[key] = object[key];
          }
        }
        return result;
      },
    
      defaults: function(object, defaults) {
        for (var key in defaults) {
          if (defaults.hasOwnProperty(key)) {
            if (!(key in object)) {
              object[key] = defaults[key];
            }
          }
        }
      },
    
      subclass: function(child, parent) {
        function ctor() { this.constructor = child; }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
      },
    
      padLeft: function(input, padding, length) {
        var result = input;
    
        var padLength = length - input.length;
        for (var i = 0; i < padLength; i++) {
          result = padding + result;
        }
    
        return result;
      },
    
      /*
       * Returns an escape sequence for given character. Uses \x for characters <=
       * 0xFF to save space, \u for the rest.
       *
       * The code needs to be in sync with the code template in the compilation
       * function for "action" nodes.
       */
      escape: function(ch) {
        var charCode = ch.charCodeAt(0);
        var escapeChar;
        var length;
    
        if (charCode <= 0xFF) {
          escapeChar = 'x';
          length = 2;
        } else {
          escapeChar = 'u';
          length = 4;
        }
    
        return '\\' + escapeChar + utils.padLeft(charCode.toString(16).toUpperCase(), '0', length);
      },
    
      /*
       * Surrounds the string with quotes and escapes characters inside so that the
       * result is a valid JavaScript string.
       *
       * The code needs to be in sync with the code template in the compilation
       * function for "action" nodes.
       */
      quote: function(s) {
        /*
         * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a string
         * literal except for the closing quote character, backslash, carriage
         * return, line separator, paragraph separator, and line feed. Any character
         * may appear in the form of an escape sequence.
         *
         * For portability, we also escape all control and non-ASCII characters.
         * Note that "\0" and "\v" escape sequences are not used because JSHint does
         * not like the first and IE the second.
         */
        return '"' + s
          .replace(/\\/g, '\\\\')  // backslash
          .replace(/"/g, '\\"')    // closing quote character
          .replace(/\x08/g, '\\b') // backspace
          .replace(/\t/g, '\\t')   // horizontal tab
          .replace(/\n/g, '\\n')   // line feed
          .replace(/\f/g, '\\f')   // form feed
          .replace(/\r/g, '\\r')   // carriage return
          .replace(/[\x00-\x07\x0B\x0E-\x1F\x80-\uFFFF]/g, utils.escape)
          + '"';
      },
    
      /*
       * Escapes characters inside the string so that it can be used as a list of
       * characters in a character class of a regular expression.
       */
      quoteForRegexpClass: function(s) {
        /*
         * Based on ECMA-262, 5th ed., 7.8.5 & 15.10.1.
         *
         * For portability, we also escape all control and non-ASCII characters.
         */
        return s
          .replace(/\\/g, '\\\\')  // backslash
          .replace(/\//g, '\\/')   // closing slash
          .replace(/\]/g, '\\]')   // closing bracket
          .replace(/\^/g, '\\^')   // caret
          .replace(/-/g,  '\\-')   // dash
          .replace(/\0/g, '\\0')   // null
          .replace(/\t/g, '\\t')   // horizontal tab
          .replace(/\n/g, '\\n')   // line feed
          .replace(/\v/g, '\\x0B') // vertical tab
          .replace(/\f/g, '\\f')   // form feed
          .replace(/\r/g, '\\r')   // carriage return
          .replace(/[\x01-\x08\x0E-\x1F\x80-\uFFFF]/g, utils.escape);
      },
    
      /*
       * Builds a node visitor -- a function which takes a node and any number of
       * other parameters, calls an appropriate function according to the node type,
       * passes it all its parameters and returns its value. The functions for
       * various node types are passed in a parameter to |buildNodeVisitor| as a
       * hash.
       */
      buildNodeVisitor: function(functions) {
        return function(node) {
          return functions[node.type].apply(null, arguments);
        };
      },
    
      findRuleByName: function(ast, name) {
        return utils.find(ast.rules, function(r) { return r.name === name; });
      },
    
      indexOfRuleByName: function(ast, name) {
        return utils.indexOf(ast.rules, function(r) { return r.name === name; });
      }
    };
    
    module.exports = utils;
  });

  modules.define("grammar-error", function(module, require) {
    var utils = require("./utils");
    
    /* Thrown when the grammar contains an error. */
    module.exports = function(message) {
      this.name = "GrammarError";
      this.message = message;
    };
    
    utils.subclass(module.exports, Error);
  });

  modules.define("parser", function(module, require) {
    module.exports = (function() {
      function commando$subclass(child, parent) {
        function ctor() { this.constructor = child; }
        ctor.prototype = parent.prototype;
        child.prototype = new ctor();
      }
    
      function SyntaxError(message, expected, found, offset, line, column) {
        this.message  = message;
        this.expected = expected;
        this.found    = found;
        this.offset   = offset;
        this.line     = line;
        this.column   = column;
    
        this.name     = "SyntaxError";
      }
    
      commando$subclass(SyntaxError, Error);
    
      function parse(input) {
        var options = arguments.length > 1 ? arguments[1] : {},
    
            commando$FAILED = {},
    
            commando$startRuleFunctions = { grammar: commando$parsegrammar },
            commando$startRuleFunction  = commando$parsegrammar,
    
            commando$c0 = commando$FAILED,
            commando$c1 = null,
            commando$c2 = [],
            commando$c3 = function(initializer, rules) {
                  return {
                    type:        "grammar",
                    initializer: initializer,
                    rules:       rules
                  };
                },
            commando$c4 = function(code) {
                  return {
                    type: "initializer",
                    code: code
                  };
                },
            commando$c5 = function(name, displayName, expression) {
                  return {
                    type:        "rule",
                    name:        name,
                    expression:  displayName !== null
                      ? {
                          type:       "named",
                          name:       displayName,
                          expression: expression
                        }
                      : expression
                  };
                },
            commando$c6 = function(head, tail) {
                  if (tail.length > 0) {
                    var alternatives = [head].concat(utils.map(
                        tail,
                        function(element) { return element[1]; }
                    ));
                    return {
                      type:         "choice",
                      alternatives: alternatives
                    };
                  } else {
                    return head;
                  }
                },
            commando$c7 = function(elements, code) {
                  var expression = elements.length !== 1
                    ? {
                        type:     "sequence",
                        elements: elements
                      }
                    : elements[0];
                  return {
                    type:       "action",
                    expression: expression,
                    code:       code
                  };
                },
            commando$c8 = function(elements) {
                  return elements.length !== 1
                    ? {
                        type:     "sequence",
                        elements: elements
                      }
                    : elements[0];
                },
            commando$c9 = function(label, expression) {
                  return {
                    type:       "labeled",
                    label:      label,
                    expression: expression
                  };
                },
            commando$c10 = function(expression) {
                  return {
                    type:       "text",
                    expression: expression
                  };
                },
            commando$c11 = function(code) {
                  return {
                    type: "semantic_and",
                    code: code
                  };
                },
            commando$c12 = function(expression) {
                  return {
                    type:       "simple_and",
                    expression: expression
                  };
                },
            commando$c13 = function(code) {
                  return {
                    type: "semantic_not",
                    code: code
                  };
                },
            commando$c14 = function(expression) {
                  return {
                    type:       "simple_not",
                    expression: expression
                  };
                },
            commando$c15 = function(expression) {
                  return {
                    type:       "optional",
                    expression: expression
                  };
                },
            commando$c16 = function(expression) {
                  return {
                    type:       "zero_or_more",
                    expression: expression
                  };
                },
            commando$c17 = function(expression) {
                  return {
                    type:       "one_or_more",
                    expression: expression
                  };
                },
            commando$c18 = void 0,
            commando$c19 = function(name) {
                  return {
                    type: "rule_ref",
                    name: name
                  };
                },
            commando$c20 = function() { return { type: "any" }; },
            commando$c21 = function(expression) { return expression; },
            commando$c22 = { type: "other", description: "action" },
            commando$c23 = function(braced) { return braced.substr(1, braced.length - 2); },
            commando$c24 = "{",
            commando$c25 = { type: "literal", value: "{", description: "\"{\"" },
            commando$c26 = "}",
            commando$c27 = { type: "literal", value: "}", description: "\"}\"" },
            commando$c28 = /^[^{}]/,
            commando$c29 = { type: "class", value: "[^{}]", description: "[^{}]" },
            commando$c30 = "=",
            commando$c31 = { type: "literal", value: "=", description: "\"=\"" },
            commando$c32 = function() { return "="; },
            commando$c33 = ":",
            commando$c34 = { type: "literal", value: ":", description: "\":\"" },
            commando$c35 = function() { return ":"; },
            commando$c36 = ";",
            commando$c37 = { type: "literal", value: ";", description: "\";\"" },
            commando$c38 = function() { return ";"; },
            commando$c39 = "/",
            commando$c40 = { type: "literal", value: "/", description: "\"/\"" },
            commando$c41 = function() { return "/"; },
            commando$c42 = "&",
            commando$c43 = { type: "literal", value: "&", description: "\"&\"" },
            commando$c44 = function() { return "&"; },
            commando$c45 = "!",
            commando$c46 = { type: "literal", value: "!", description: "\"!\"" },
            commando$c47 = function() { return "!"; },
            commando$c48 = "$",
            commando$c49 = { type: "literal", value: "$", description: "\"$\"" },
            commando$c50 = function() { return "$"; },
            commando$c51 = "?",
            commando$c52 = { type: "literal", value: "?", description: "\"?\"" },
            commando$c53 = function() { return "?"; },
            commando$c54 = "*",
            commando$c55 = { type: "literal", value: "*", description: "\"*\"" },
            commando$c56 = function() { return "*"; },
            commando$c57 = "+",
            commando$c58 = { type: "literal", value: "+", description: "\"+\"" },
            commando$c59 = function() { return "+"; },
            commando$c60 = "(",
            commando$c61 = { type: "literal", value: "(", description: "\"(\"" },
            commando$c62 = function() { return "("; },
            commando$c63 = ")",
            commando$c64 = { type: "literal", value: ")", description: "\")\"" },
            commando$c65 = function() { return ")"; },
            commando$c66 = ".",
            commando$c67 = { type: "literal", value: ".", description: "\".\"" },
            commando$c68 = function() { return "."; },
            commando$c69 = { type: "other", description: "identifier" },
            commando$c70 = "_",
            commando$c71 = { type: "literal", value: "_", description: "\"_\"" },
            commando$c72 = function(chars) { return chars; },
            commando$c73 = { type: "other", description: "literal" },
            commando$c74 = "i",
            commando$c75 = { type: "literal", value: "i", description: "\"i\"" },
            commando$c76 = function(value, flags) {
                  return {
                    type:       "literal",
                    value:      value,
                    ignoreCase: flags === "i"
                  };
                },
            commando$c77 = { type: "other", description: "string" },
            commando$c78 = function(string) { return string; },
            commando$c79 = "\"",
            commando$c80 = { type: "literal", value: "\"", description: "\"\\\"\"" },
            commando$c81 = function(chars) { return chars.join(""); },
            commando$c82 = "\\",
            commando$c83 = { type: "literal", value: "\\", description: "\"\\\\\"" },
            commando$c84 = { type: "any", description: "any character" },
            commando$c85 = function(char_) { return char_; },
            commando$c86 = "'",
            commando$c87 = { type: "literal", value: "'", description: "\"'\"" },
            commando$c88 = { type: "other", description: "character class" },
            commando$c89 = "[",
            commando$c90 = { type: "literal", value: "[", description: "\"[\"" },
            commando$c91 = "^",
            commando$c92 = { type: "literal", value: "^", description: "\"^\"" },
            commando$c93 = "]",
            commando$c94 = { type: "literal", value: "]", description: "\"]\"" },
            commando$c95 = function(inverted, parts, flags) {
                  var partsConverted = utils.map(parts, function(part) { return part.data; });
                  var rawText = "["
                    + (inverted !== null ? inverted : "")
                    + utils.map(parts, function(part) { return part.rawText; }).join("")
                    + "]"
                    + (flags !== null ? flags : "");
    
                  return {
                    type:       "class",
                    parts:      partsConverted,
                    // FIXME: Get the raw text from the input directly.
                    rawText:    rawText,
                    inverted:   inverted === "^",
                    ignoreCase: flags === "i"
                  };
                },
            commando$c96 = "-",
            commando$c97 = { type: "literal", value: "-", description: "\"-\"" },
            commando$c98 = function(begin, end) {
                  if (begin.data.charCodeAt(0) > end.data.charCodeAt(0)) {
                    error(
                      "Invalid character range: " + begin.rawText + "-" + end.rawText + "."
                    );
                  }
    
                  return {
                    data:    [begin.data, end.data],
                    // FIXME: Get the raw text from the input directly.
                    rawText: begin.rawText + "-" + end.rawText
                  };
                },
            commando$c99 = function(char_) {
                  return {
                    data:    char_,
                    // FIXME: Get the raw text from the input directly.
                    rawText: utils.quoteForRegexpClass(char_)
                  };
                },
            commando$c100 = "x",
            commando$c101 = { type: "literal", value: "x", description: "\"x\"" },
            commando$c102 = "u",
            commando$c103 = { type: "literal", value: "u", description: "\"u\"" },
            commando$c104 = function(char_) {
                  return char_
                    .replace("b", "\b")
                    .replace("f", "\f")
                    .replace("n", "\n")
                    .replace("r", "\r")
                    .replace("t", "\t")
                    .replace("v", "\x0B"); // IE does not recognize "\v".
                },
            commando$c105 = "\\0",
            commando$c106 = { type: "literal", value: "\\0", description: "\"\\\\0\"" },
            commando$c107 = function() { return "\x00"; },
            commando$c108 = "\\x",
            commando$c109 = { type: "literal", value: "\\x", description: "\"\\\\x\"" },
            commando$c110 = function(digits) {
                  return String.fromCharCode(parseInt(digits, 16));
                },
            commando$c111 = "\\u",
            commando$c112 = { type: "literal", value: "\\u", description: "\"\\\\u\"" },
            commando$c113 = function(eol) { return eol; },
            commando$c114 = /^[0-9]/,
            commando$c115 = { type: "class", value: "[0-9]", description: "[0-9]" },
            commando$c116 = /^[0-9a-fA-F]/,
            commando$c117 = { type: "class", value: "[0-9a-fA-F]", description: "[0-9a-fA-F]" },
            commando$c118 = /^[a-z]/,
            commando$c119 = { type: "class", value: "[a-z]", description: "[a-z]" },
            commando$c120 = /^[A-Z]/,
            commando$c121 = { type: "class", value: "[A-Z]", description: "[A-Z]" },
            commando$c122 = { type: "other", description: "comment" },
            commando$c123 = "//",
            commando$c124 = { type: "literal", value: "//", description: "\"//\"" },
            commando$c125 = "/*",
            commando$c126 = { type: "literal", value: "/*", description: "\"/*\"" },
            commando$c127 = "*/",
            commando$c128 = { type: "literal", value: "*/", description: "\"*/\"" },
            commando$c129 = { type: "other", description: "end of line" },
            commando$c130 = "\n",
            commando$c131 = { type: "literal", value: "\n", description: "\"\\n\"" },
            commando$c132 = "\r\n",
            commando$c133 = { type: "literal", value: "\r\n", description: "\"\\r\\n\"" },
            commando$c134 = "\r",
            commando$c135 = { type: "literal", value: "\r", description: "\"\\r\"" },
            commando$c136 = "\u2028",
            commando$c137 = { type: "literal", value: "\u2028", description: "\"\\u2028\"" },
            commando$c138 = "\u2029",
            commando$c139 = { type: "literal", value: "\u2029", description: "\"\\u2029\"" },
            commando$c140 = /^[\n\r\u2028\u2029]/,
            commando$c141 = { type: "class", value: "[\\n\\r\\u2028\\u2029]", description: "[\\n\\r\\u2028\\u2029]" },
            commando$c142 = { type: "other", description: "whitespace" },
            commando$c143 = /^[ \t\x0B\f\xA0\uFEFF\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/,
            commando$c144 = { type: "class", value: "[ \\t\\x0B\\f\\xA0\\uFEFF\\u1680\\u180E\\u2000-\\u200A\\u202F\\u205F\\u3000]", description: "[ \\t\\x0B\\f\\xA0\\uFEFF\\u1680\\u180E\\u2000-\\u200A\\u202F\\u205F\\u3000]" },
    
            commando$currPos          = 0,
            commando$reportedPos      = 0,
            commando$cachedPos        = 0,
            commando$cachedPosDetails = { line: 1, column: 1, seenCR: false },
            commando$maxFailPos       = 0,
            commando$maxFailExpected  = [],
            commando$silentFails      = 0,
    
            commando$result;
    
        if ("startRule" in options) {
          if (!(options.startRule in commando$startRuleFunctions)) {
            throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
          }
    
          commando$startRuleFunction = commando$startRuleFunctions[options.startRule];
        }
    
        function text() {
          return input.substring(commando$reportedPos, commando$currPos);
        }
    
        function offset() {
          return commando$reportedPos;
        }
    
        function line() {
          return commando$computePosDetails(commando$reportedPos).line;
        }
    
        function column() {
          return commando$computePosDetails(commando$reportedPos).column;
        }
    
        function expected(description) {
          throw commando$buildException(
            null,
            [{ type: "other", description: description }],
            commando$reportedPos
          );
        }
    
        function error(message) {
          throw commando$buildException(message, null, commando$reportedPos);
        }
    
        function commando$computePosDetails(pos) {
          function advance(details, startPos, endPos) {
            var p, ch;
    
            for (p = startPos; p < endPos; p++) {
              ch = input.charAt(p);
              if (ch === "\n") {
                if (!details.seenCR) { details.line++; }
                details.column = 1;
                details.seenCR = false;
              } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
                details.line++;
                details.column = 1;
                details.seenCR = true;
              } else {
                details.column++;
                details.seenCR = false;
              }
            }
          }
    
          if (commando$cachedPos !== pos) {
            if (commando$cachedPos > pos) {
              commando$cachedPos = 0;
              commando$cachedPosDetails = { line: 1, column: 1, seenCR: false };
            }
            advance(commando$cachedPosDetails, commando$cachedPos, pos);
            commando$cachedPos = pos;
          }
    
          return commando$cachedPosDetails;
        }
    
        function commando$fail(expected) {
          if (commando$currPos < commando$maxFailPos) { return; }
    
          if (commando$currPos > commando$maxFailPos) {
            commando$maxFailPos = commando$currPos;
            commando$maxFailExpected = [];
          }
    
          commando$maxFailExpected.push(expected);
        }
    
        function commando$buildException(message, expected, pos) {
          function cleanupExpected(expected) {
            var i = 1;
    
            expected.sort(function(a, b) {
              if (a.description < b.description) {
                return -1;
              } else if (a.description > b.description) {
                return 1;
              } else {
                return 0;
              }
            });
    
            while (i < expected.length) {
              if (expected[i - 1] === expected[i]) {
                expected.splice(i, 1);
              } else {
                i++;
              }
            }
          }
    
          function buildMessage(expected, found) {
            function stringEscape(s) {
              function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }
    
              return s
                .replace(/\\/g,   '\\\\')
                .replace(/"/g,    '\\"')
                .replace(/\x08/g, '\\b')
                .replace(/\t/g,   '\\t')
                .replace(/\n/g,   '\\n')
                .replace(/\f/g,   '\\f')
                .replace(/\r/g,   '\\r')
                .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
                .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
                .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
                .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
            }
    
            var expectedDescs = new Array(expected.length),
                expectedDesc, foundDesc, i;
    
            for (i = 0; i < expected.length; i++) {
              expectedDescs[i] = expected[i].description;
            }
    
            expectedDesc = expected.length > 1
              ? expectedDescs.slice(0, -1).join(", ")
                  + " or "
                  + expectedDescs[expected.length - 1]
              : expectedDescs[0];
    
            foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";
    
            return "Expected " + expectedDesc + " but " + foundDesc + " found.";
          }
    
          var posDetails = commando$computePosDetails(pos),
              found      = pos < input.length ? input.charAt(pos) : null;
    
          if (expected !== null) {
            cleanupExpected(expected);
          }
    
          return new SyntaxError(
            message !== null ? message : buildMessage(expected, found),
            expected,
            found,
            pos,
            posDetails.line,
            posDetails.column
          );
        }
    
        function commando$parsegrammar() {
          var s0, s1, s2, s3, s4;
    
          s0 = commando$currPos;
          s1 = commando$parse__();
          if (s1 !== commando$FAILED) {
            s2 = commando$parseinitializer();
            if (s2 === commando$FAILED) {
              s2 = commando$c1;
            }
            if (s2 !== commando$FAILED) {
              s3 = [];
              s4 = commando$parserule();
              if (s4 !== commando$FAILED) {
                while (s4 !== commando$FAILED) {
                  s3.push(s4);
                  s4 = commando$parserule();
                }
              } else {
                s3 = commando$c0;
              }
              if (s3 !== commando$FAILED) {
                commando$reportedPos = s0;
                s1 = commando$c3(s2, s3);
                s0 = s1;
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parseinitializer() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          s1 = commando$parseaction();
          if (s1 !== commando$FAILED) {
            s2 = commando$parsesemicolon();
            if (s2 === commando$FAILED) {
              s2 = commando$c1;
            }
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c4(s1);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parserule() {
          var s0, s1, s2, s3, s4, s5;
    
          s0 = commando$currPos;
          s1 = commando$parseidentifier();
          if (s1 !== commando$FAILED) {
            s2 = commando$parsestring();
            if (s2 === commando$FAILED) {
              s2 = commando$c1;
            }
            if (s2 !== commando$FAILED) {
              s3 = commando$parseequals();
              if (s3 !== commando$FAILED) {
                s4 = commando$parsechoice();
                if (s4 !== commando$FAILED) {
                  s5 = commando$parsesemicolon();
                  if (s5 === commando$FAILED) {
                    s5 = commando$c1;
                  }
                  if (s5 !== commando$FAILED) {
                    commando$reportedPos = s0;
                    s1 = commando$c5(s1, s2, s4);
                    s0 = s1;
                  } else {
                    commando$currPos = s0;
                    s0 = commando$c0;
                  }
                } else {
                  commando$currPos = s0;
                  s0 = commando$c0;
                }
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsechoice() {
          var s0, s1, s2, s3, s4, s5;
    
          s0 = commando$currPos;
          s1 = commando$parsesequence();
          if (s1 !== commando$FAILED) {
            s2 = [];
            s3 = commando$currPos;
            s4 = commando$parseslash();
            if (s4 !== commando$FAILED) {
              s5 = commando$parsesequence();
              if (s5 !== commando$FAILED) {
                s4 = [s4, s5];
                s3 = s4;
              } else {
                commando$currPos = s3;
                s3 = commando$c0;
              }
            } else {
              commando$currPos = s3;
              s3 = commando$c0;
            }
            while (s3 !== commando$FAILED) {
              s2.push(s3);
              s3 = commando$currPos;
              s4 = commando$parseslash();
              if (s4 !== commando$FAILED) {
                s5 = commando$parsesequence();
                if (s5 !== commando$FAILED) {
                  s4 = [s4, s5];
                  s3 = s4;
                } else {
                  commando$currPos = s3;
                  s3 = commando$c0;
                }
              } else {
                commando$currPos = s3;
                s3 = commando$c0;
              }
            }
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c6(s1, s2);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsesequence() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          s1 = [];
          s2 = commando$parselabeled();
          while (s2 !== commando$FAILED) {
            s1.push(s2);
            s2 = commando$parselabeled();
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parseaction();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c7(s1, s2);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
          if (s0 === commando$FAILED) {
            s0 = commando$currPos;
            s1 = [];
            s2 = commando$parselabeled();
            while (s2 !== commando$FAILED) {
              s1.push(s2);
              s2 = commando$parselabeled();
            }
            if (s1 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c8(s1);
            }
            s0 = s1;
          }
    
          return s0;
        }
    
        function commando$parselabeled() {
          var s0, s1, s2, s3;
    
          s0 = commando$currPos;
          s1 = commando$parseidentifier();
          if (s1 !== commando$FAILED) {
            s2 = commando$parsecolon();
            if (s2 !== commando$FAILED) {
              s3 = commando$parseprefixed();
              if (s3 !== commando$FAILED) {
                commando$reportedPos = s0;
                s1 = commando$c9(s1, s3);
                s0 = s1;
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
          if (s0 === commando$FAILED) {
            s0 = commando$parseprefixed();
          }
    
          return s0;
        }
    
        function commando$parseprefixed() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          s1 = commando$parsedollar();
          if (s1 !== commando$FAILED) {
            s2 = commando$parsesuffixed();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c10(s2);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
          if (s0 === commando$FAILED) {
            s0 = commando$currPos;
            s1 = commando$parseand();
            if (s1 !== commando$FAILED) {
              s2 = commando$parseaction();
              if (s2 !== commando$FAILED) {
                commando$reportedPos = s0;
                s1 = commando$c11(s2);
                s0 = s1;
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
            if (s0 === commando$FAILED) {
              s0 = commando$currPos;
              s1 = commando$parseand();
              if (s1 !== commando$FAILED) {
                s2 = commando$parsesuffixed();
                if (s2 !== commando$FAILED) {
                  commando$reportedPos = s0;
                  s1 = commando$c12(s2);
                  s0 = s1;
                } else {
                  commando$currPos = s0;
                  s0 = commando$c0;
                }
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
              if (s0 === commando$FAILED) {
                s0 = commando$currPos;
                s1 = commando$parsenot();
                if (s1 !== commando$FAILED) {
                  s2 = commando$parseaction();
                  if (s2 !== commando$FAILED) {
                    commando$reportedPos = s0;
                    s1 = commando$c13(s2);
                    s0 = s1;
                  } else {
                    commando$currPos = s0;
                    s0 = commando$c0;
                  }
                } else {
                  commando$currPos = s0;
                  s0 = commando$c0;
                }
                if (s0 === commando$FAILED) {
                  s0 = commando$currPos;
                  s1 = commando$parsenot();
                  if (s1 !== commando$FAILED) {
                    s2 = commando$parsesuffixed();
                    if (s2 !== commando$FAILED) {
                      commando$reportedPos = s0;
                      s1 = commando$c14(s2);
                      s0 = s1;
                    } else {
                      commando$currPos = s0;
                      s0 = commando$c0;
                    }
                  } else {
                    commando$currPos = s0;
                    s0 = commando$c0;
                  }
                  if (s0 === commando$FAILED) {
                    s0 = commando$parsesuffixed();
                  }
                }
              }
            }
          }
    
          return s0;
        }
    
        function commando$parsesuffixed() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          s1 = commando$parseprimary();
          if (s1 !== commando$FAILED) {
            s2 = commando$parsequestion();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c15(s1);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
          if (s0 === commando$FAILED) {
            s0 = commando$currPos;
            s1 = commando$parseprimary();
            if (s1 !== commando$FAILED) {
              s2 = commando$parsestar();
              if (s2 !== commando$FAILED) {
                commando$reportedPos = s0;
                s1 = commando$c16(s1);
                s0 = s1;
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
            if (s0 === commando$FAILED) {
              s0 = commando$currPos;
              s1 = commando$parseprimary();
              if (s1 !== commando$FAILED) {
                s2 = commando$parseplus();
                if (s2 !== commando$FAILED) {
                  commando$reportedPos = s0;
                  s1 = commando$c17(s1);
                  s0 = s1;
                } else {
                  commando$currPos = s0;
                  s0 = commando$c0;
                }
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
              if (s0 === commando$FAILED) {
                s0 = commando$parseprimary();
              }
            }
          }
    
          return s0;
        }
    
        function commando$parseprimary() {
          var s0, s1, s2, s3, s4, s5;
    
          s0 = commando$currPos;
          s1 = commando$parseidentifier();
          if (s1 !== commando$FAILED) {
            s2 = commando$currPos;
            commando$silentFails++;
            s3 = commando$currPos;
            s4 = commando$parsestring();
            if (s4 === commando$FAILED) {
              s4 = commando$c1;
            }
            if (s4 !== commando$FAILED) {
              s5 = commando$parseequals();
              if (s5 !== commando$FAILED) {
                s4 = [s4, s5];
                s3 = s4;
              } else {
                commando$currPos = s3;
                s3 = commando$c0;
              }
            } else {
              commando$currPos = s3;
              s3 = commando$c0;
            }
            commando$silentFails--;
            if (s3 === commando$FAILED) {
              s2 = commando$c18;
            } else {
              commando$currPos = s2;
              s2 = commando$c0;
            }
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c19(s1);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
          if (s0 === commando$FAILED) {
            s0 = commando$parseliteral();
            if (s0 === commando$FAILED) {
              s0 = commando$parseclass();
              if (s0 === commando$FAILED) {
                s0 = commando$currPos;
                s1 = commando$parsedot();
                if (s1 !== commando$FAILED) {
                  commando$reportedPos = s0;
                  s1 = commando$c20();
                }
                s0 = s1;
                if (s0 === commando$FAILED) {
                  s0 = commando$currPos;
                  s1 = commando$parselparen();
                  if (s1 !== commando$FAILED) {
                    s2 = commando$parsechoice();
                    if (s2 !== commando$FAILED) {
                      s3 = commando$parserparen();
                      if (s3 !== commando$FAILED) {
                        commando$reportedPos = s0;
                        s1 = commando$c21(s2);
                        s0 = s1;
                      } else {
                        commando$currPos = s0;
                        s0 = commando$c0;
                      }
                    } else {
                      commando$currPos = s0;
                      s0 = commando$c0;
                    }
                  } else {
                    commando$currPos = s0;
                    s0 = commando$c0;
                  }
                }
              }
            }
          }
    
          return s0;
        }
    
        function commando$parseaction() {
          var s0, s1, s2;
    
          commando$silentFails++;
          s0 = commando$currPos;
          s1 = commando$parsebraced();
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c23(s1);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
          commando$silentFails--;
          if (s0 === commando$FAILED) {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c22); }
          }
    
          return s0;
        }
    
        function commando$parsebraced() {
          var s0, s1, s2, s3, s4;
    
          s0 = commando$currPos;
          s1 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 123) {
            s2 = commando$c24;
            commando$currPos++;
          } else {
            s2 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c25); }
          }
          if (s2 !== commando$FAILED) {
            s3 = [];
            s4 = commando$parsebraced();
            if (s4 === commando$FAILED) {
              s4 = commando$parsenonBraceCharacters();
            }
            while (s4 !== commando$FAILED) {
              s3.push(s4);
              s4 = commando$parsebraced();
              if (s4 === commando$FAILED) {
                s4 = commando$parsenonBraceCharacters();
              }
            }
            if (s3 !== commando$FAILED) {
              if (input.charCodeAt(commando$currPos) === 125) {
                s4 = commando$c26;
                commando$currPos++;
              } else {
                s4 = commando$FAILED;
                if (commando$silentFails === 0) { commando$fail(commando$c27); }
              }
              if (s4 !== commando$FAILED) {
                s2 = [s2, s3, s4];
                s1 = s2;
              } else {
                commando$currPos = s1;
                s1 = commando$c0;
              }
            } else {
              commando$currPos = s1;
              s1 = commando$c0;
            }
          } else {
            commando$currPos = s1;
            s1 = commando$c0;
          }
          if (s1 !== commando$FAILED) {
            s1 = input.substring(s0, commando$currPos);
          }
          s0 = s1;
    
          return s0;
        }
    
        function commando$parsenonBraceCharacters() {
          var s0, s1;
    
          s0 = [];
          s1 = commando$parsenonBraceCharacter();
          if (s1 !== commando$FAILED) {
            while (s1 !== commando$FAILED) {
              s0.push(s1);
              s1 = commando$parsenonBraceCharacter();
            }
          } else {
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsenonBraceCharacter() {
          var s0;
    
          if (commando$c28.test(input.charAt(commando$currPos))) {
            s0 = input.charAt(commando$currPos);
            commando$currPos++;
          } else {
            s0 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c29); }
          }
    
          return s0;
        }
    
        function commando$parseequals() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 61) {
            s1 = commando$c30;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c31); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c32();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsecolon() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 58) {
            s1 = commando$c33;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c34); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c35();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsesemicolon() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 59) {
            s1 = commando$c36;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c37); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c38();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parseslash() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 47) {
            s1 = commando$c39;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c40); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c41();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parseand() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 38) {
            s1 = commando$c42;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c43); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c44();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsenot() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 33) {
            s1 = commando$c45;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c46); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c47();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsedollar() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 36) {
            s1 = commando$c48;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c49); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c50();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsequestion() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 63) {
            s1 = commando$c51;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c52); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c53();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsestar() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 42) {
            s1 = commando$c54;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c55); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c56();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parseplus() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 43) {
            s1 = commando$c57;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c58); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c59();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parselparen() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 40) {
            s1 = commando$c60;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c61); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c62();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parserparen() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 41) {
            s1 = commando$c63;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c64); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c65();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsedot() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 46) {
            s1 = commando$c66;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c67); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c68();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parseidentifier() {
          var s0, s1, s2, s3, s4, s5;
    
          commando$silentFails++;
          s0 = commando$currPos;
          s1 = commando$currPos;
          s2 = commando$currPos;
          s3 = commando$parseletter();
          if (s3 === commando$FAILED) {
            if (input.charCodeAt(commando$currPos) === 95) {
              s3 = commando$c70;
              commando$currPos++;
            } else {
              s3 = commando$FAILED;
              if (commando$silentFails === 0) { commando$fail(commando$c71); }
            }
          }
          if (s3 !== commando$FAILED) {
            s4 = [];
            s5 = commando$parseletter();
            if (s5 === commando$FAILED) {
              s5 = commando$parsedigit();
              if (s5 === commando$FAILED) {
                if (input.charCodeAt(commando$currPos) === 95) {
                  s5 = commando$c70;
                  commando$currPos++;
                } else {
                  s5 = commando$FAILED;
                  if (commando$silentFails === 0) { commando$fail(commando$c71); }
                }
              }
            }
            while (s5 !== commando$FAILED) {
              s4.push(s5);
              s5 = commando$parseletter();
              if (s5 === commando$FAILED) {
                s5 = commando$parsedigit();
                if (s5 === commando$FAILED) {
                  if (input.charCodeAt(commando$currPos) === 95) {
                    s5 = commando$c70;
                    commando$currPos++;
                  } else {
                    s5 = commando$FAILED;
                    if (commando$silentFails === 0) { commando$fail(commando$c71); }
                  }
                }
              }
            }
            if (s4 !== commando$FAILED) {
              s3 = [s3, s4];
              s2 = s3;
            } else {
              commando$currPos = s2;
              s2 = commando$c0;
            }
          } else {
            commando$currPos = s2;
            s2 = commando$c0;
          }
          if (s2 !== commando$FAILED) {
            s2 = input.substring(s1, commando$currPos);
          }
          s1 = s2;
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c72(s1);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
          commando$silentFails--;
          if (s0 === commando$FAILED) {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c69); }
          }
    
          return s0;
        }
    
        function commando$parseliteral() {
          var s0, s1, s2, s3;
    
          commando$silentFails++;
          s0 = commando$currPos;
          s1 = commando$parsedoubleQuotedString();
          if (s1 === commando$FAILED) {
            s1 = commando$parsesingleQuotedString();
          }
          if (s1 !== commando$FAILED) {
            if (input.charCodeAt(commando$currPos) === 105) {
              s2 = commando$c74;
              commando$currPos++;
            } else {
              s2 = commando$FAILED;
              if (commando$silentFails === 0) { commando$fail(commando$c75); }
            }
            if (s2 === commando$FAILED) {
              s2 = commando$c1;
            }
            if (s2 !== commando$FAILED) {
              s3 = commando$parse__();
              if (s3 !== commando$FAILED) {
                commando$reportedPos = s0;
                s1 = commando$c76(s1, s2);
                s0 = s1;
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
          commando$silentFails--;
          if (s0 === commando$FAILED) {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c73); }
          }
    
          return s0;
        }
    
        function commando$parsestring() {
          var s0, s1, s2;
    
          commando$silentFails++;
          s0 = commando$currPos;
          s1 = commando$parsedoubleQuotedString();
          if (s1 === commando$FAILED) {
            s1 = commando$parsesingleQuotedString();
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parse__();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c78(s1);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
          commando$silentFails--;
          if (s0 === commando$FAILED) {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c77); }
          }
    
          return s0;
        }
    
        function commando$parsedoubleQuotedString() {
          var s0, s1, s2, s3;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 34) {
            s1 = commando$c79;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c80); }
          }
          if (s1 !== commando$FAILED) {
            s2 = [];
            s3 = commando$parsedoubleQuotedCharacter();
            while (s3 !== commando$FAILED) {
              s2.push(s3);
              s3 = commando$parsedoubleQuotedCharacter();
            }
            if (s2 !== commando$FAILED) {
              if (input.charCodeAt(commando$currPos) === 34) {
                s3 = commando$c79;
                commando$currPos++;
              } else {
                s3 = commando$FAILED;
                if (commando$silentFails === 0) { commando$fail(commando$c80); }
              }
              if (s3 !== commando$FAILED) {
                commando$reportedPos = s0;
                s1 = commando$c81(s2);
                s0 = s1;
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsedoubleQuotedCharacter() {
          var s0;
    
          s0 = commando$parsesimpleDoubleQuotedCharacter();
          if (s0 === commando$FAILED) {
            s0 = commando$parsesimpleEscapeSequence();
            if (s0 === commando$FAILED) {
              s0 = commando$parsezeroEscapeSequence();
              if (s0 === commando$FAILED) {
                s0 = commando$parsehexEscapeSequence();
                if (s0 === commando$FAILED) {
                  s0 = commando$parseunicodeEscapeSequence();
                  if (s0 === commando$FAILED) {
                    s0 = commando$parseeolEscapeSequence();
                  }
                }
              }
            }
          }
    
          return s0;
        }
    
        function commando$parsesimpleDoubleQuotedCharacter() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          s1 = commando$currPos;
          commando$silentFails++;
          if (input.charCodeAt(commando$currPos) === 34) {
            s2 = commando$c79;
            commando$currPos++;
          } else {
            s2 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c80); }
          }
          if (s2 === commando$FAILED) {
            if (input.charCodeAt(commando$currPos) === 92) {
              s2 = commando$c82;
              commando$currPos++;
            } else {
              s2 = commando$FAILED;
              if (commando$silentFails === 0) { commando$fail(commando$c83); }
            }
            if (s2 === commando$FAILED) {
              s2 = commando$parseeolChar();
            }
          }
          commando$silentFails--;
          if (s2 === commando$FAILED) {
            s1 = commando$c18;
          } else {
            commando$currPos = s1;
            s1 = commando$c0;
          }
          if (s1 !== commando$FAILED) {
            if (input.length > commando$currPos) {
              s2 = input.charAt(commando$currPos);
              commando$currPos++;
            } else {
              s2 = commando$FAILED;
              if (commando$silentFails === 0) { commando$fail(commando$c84); }
            }
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c85(s2);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsesingleQuotedString() {
          var s0, s1, s2, s3;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 39) {
            s1 = commando$c86;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c87); }
          }
          if (s1 !== commando$FAILED) {
            s2 = [];
            s3 = commando$parsesingleQuotedCharacter();
            while (s3 !== commando$FAILED) {
              s2.push(s3);
              s3 = commando$parsesingleQuotedCharacter();
            }
            if (s2 !== commando$FAILED) {
              if (input.charCodeAt(commando$currPos) === 39) {
                s3 = commando$c86;
                commando$currPos++;
              } else {
                s3 = commando$FAILED;
                if (commando$silentFails === 0) { commando$fail(commando$c87); }
              }
              if (s3 !== commando$FAILED) {
                commando$reportedPos = s0;
                s1 = commando$c81(s2);
                s0 = s1;
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsesingleQuotedCharacter() {
          var s0;
    
          s0 = commando$parsesimpleSingleQuotedCharacter();
          if (s0 === commando$FAILED) {
            s0 = commando$parsesimpleEscapeSequence();
            if (s0 === commando$FAILED) {
              s0 = commando$parsezeroEscapeSequence();
              if (s0 === commando$FAILED) {
                s0 = commando$parsehexEscapeSequence();
                if (s0 === commando$FAILED) {
                  s0 = commando$parseunicodeEscapeSequence();
                  if (s0 === commando$FAILED) {
                    s0 = commando$parseeolEscapeSequence();
                  }
                }
              }
            }
          }
    
          return s0;
        }
    
        function commando$parsesimpleSingleQuotedCharacter() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          s1 = commando$currPos;
          commando$silentFails++;
          if (input.charCodeAt(commando$currPos) === 39) {
            s2 = commando$c86;
            commando$currPos++;
          } else {
            s2 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c87); }
          }
          if (s2 === commando$FAILED) {
            if (input.charCodeAt(commando$currPos) === 92) {
              s2 = commando$c82;
              commando$currPos++;
            } else {
              s2 = commando$FAILED;
              if (commando$silentFails === 0) { commando$fail(commando$c83); }
            }
            if (s2 === commando$FAILED) {
              s2 = commando$parseeolChar();
            }
          }
          commando$silentFails--;
          if (s2 === commando$FAILED) {
            s1 = commando$c18;
          } else {
            commando$currPos = s1;
            s1 = commando$c0;
          }
          if (s1 !== commando$FAILED) {
            if (input.length > commando$currPos) {
              s2 = input.charAt(commando$currPos);
              commando$currPos++;
            } else {
              s2 = commando$FAILED;
              if (commando$silentFails === 0) { commando$fail(commando$c84); }
            }
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c85(s2);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parseclass() {
          var s0, s1, s2, s3, s4, s5, s6;
    
          commando$silentFails++;
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 91) {
            s1 = commando$c89;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c90); }
          }
          if (s1 !== commando$FAILED) {
            if (input.charCodeAt(commando$currPos) === 94) {
              s2 = commando$c91;
              commando$currPos++;
            } else {
              s2 = commando$FAILED;
              if (commando$silentFails === 0) { commando$fail(commando$c92); }
            }
            if (s2 === commando$FAILED) {
              s2 = commando$c1;
            }
            if (s2 !== commando$FAILED) {
              s3 = [];
              s4 = commando$parseclassCharacterRange();
              if (s4 === commando$FAILED) {
                s4 = commando$parseclassCharacter();
              }
              while (s4 !== commando$FAILED) {
                s3.push(s4);
                s4 = commando$parseclassCharacterRange();
                if (s4 === commando$FAILED) {
                  s4 = commando$parseclassCharacter();
                }
              }
              if (s3 !== commando$FAILED) {
                if (input.charCodeAt(commando$currPos) === 93) {
                  s4 = commando$c93;
                  commando$currPos++;
                } else {
                  s4 = commando$FAILED;
                  if (commando$silentFails === 0) { commando$fail(commando$c94); }
                }
                if (s4 !== commando$FAILED) {
                  if (input.charCodeAt(commando$currPos) === 105) {
                    s5 = commando$c74;
                    commando$currPos++;
                  } else {
                    s5 = commando$FAILED;
                    if (commando$silentFails === 0) { commando$fail(commando$c75); }
                  }
                  if (s5 === commando$FAILED) {
                    s5 = commando$c1;
                  }
                  if (s5 !== commando$FAILED) {
                    s6 = commando$parse__();
                    if (s6 !== commando$FAILED) {
                      commando$reportedPos = s0;
                      s1 = commando$c95(s2, s3, s5);
                      s0 = s1;
                    } else {
                      commando$currPos = s0;
                      s0 = commando$c0;
                    }
                  } else {
                    commando$currPos = s0;
                    s0 = commando$c0;
                  }
                } else {
                  commando$currPos = s0;
                  s0 = commando$c0;
                }
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
          commando$silentFails--;
          if (s0 === commando$FAILED) {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c88); }
          }
    
          return s0;
        }
    
        function commando$parseclassCharacterRange() {
          var s0, s1, s2, s3;
    
          s0 = commando$currPos;
          s1 = commando$parseclassCharacter();
          if (s1 !== commando$FAILED) {
            if (input.charCodeAt(commando$currPos) === 45) {
              s2 = commando$c96;
              commando$currPos++;
            } else {
              s2 = commando$FAILED;
              if (commando$silentFails === 0) { commando$fail(commando$c97); }
            }
            if (s2 !== commando$FAILED) {
              s3 = commando$parseclassCharacter();
              if (s3 !== commando$FAILED) {
                commando$reportedPos = s0;
                s1 = commando$c98(s1, s3);
                s0 = s1;
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parseclassCharacter() {
          var s0, s1;
    
          s0 = commando$currPos;
          s1 = commando$parsebracketDelimitedCharacter();
          if (s1 !== commando$FAILED) {
            commando$reportedPos = s0;
            s1 = commando$c99(s1);
          }
          s0 = s1;
    
          return s0;
        }
    
        function commando$parsebracketDelimitedCharacter() {
          var s0;
    
          s0 = commando$parsesimpleBracketDelimitedCharacter();
          if (s0 === commando$FAILED) {
            s0 = commando$parsesimpleEscapeSequence();
            if (s0 === commando$FAILED) {
              s0 = commando$parsezeroEscapeSequence();
              if (s0 === commando$FAILED) {
                s0 = commando$parsehexEscapeSequence();
                if (s0 === commando$FAILED) {
                  s0 = commando$parseunicodeEscapeSequence();
                  if (s0 === commando$FAILED) {
                    s0 = commando$parseeolEscapeSequence();
                  }
                }
              }
            }
          }
    
          return s0;
        }
    
        function commando$parsesimpleBracketDelimitedCharacter() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          s1 = commando$currPos;
          commando$silentFails++;
          if (input.charCodeAt(commando$currPos) === 93) {
            s2 = commando$c93;
            commando$currPos++;
          } else {
            s2 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c94); }
          }
          if (s2 === commando$FAILED) {
            if (input.charCodeAt(commando$currPos) === 92) {
              s2 = commando$c82;
              commando$currPos++;
            } else {
              s2 = commando$FAILED;
              if (commando$silentFails === 0) { commando$fail(commando$c83); }
            }
            if (s2 === commando$FAILED) {
              s2 = commando$parseeolChar();
            }
          }
          commando$silentFails--;
          if (s2 === commando$FAILED) {
            s1 = commando$c18;
          } else {
            commando$currPos = s1;
            s1 = commando$c0;
          }
          if (s1 !== commando$FAILED) {
            if (input.length > commando$currPos) {
              s2 = input.charAt(commando$currPos);
              commando$currPos++;
            } else {
              s2 = commando$FAILED;
              if (commando$silentFails === 0) { commando$fail(commando$c84); }
            }
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c85(s2);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsesimpleEscapeSequence() {
          var s0, s1, s2, s3;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 92) {
            s1 = commando$c82;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c83); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$currPos;
            commando$silentFails++;
            s3 = commando$parsedigit();
            if (s3 === commando$FAILED) {
              if (input.charCodeAt(commando$currPos) === 120) {
                s3 = commando$c100;
                commando$currPos++;
              } else {
                s3 = commando$FAILED;
                if (commando$silentFails === 0) { commando$fail(commando$c101); }
              }
              if (s3 === commando$FAILED) {
                if (input.charCodeAt(commando$currPos) === 117) {
                  s3 = commando$c102;
                  commando$currPos++;
                } else {
                  s3 = commando$FAILED;
                  if (commando$silentFails === 0) { commando$fail(commando$c103); }
                }
                if (s3 === commando$FAILED) {
                  s3 = commando$parseeolChar();
                }
              }
            }
            commando$silentFails--;
            if (s3 === commando$FAILED) {
              s2 = commando$c18;
            } else {
              commando$currPos = s2;
              s2 = commando$c0;
            }
            if (s2 !== commando$FAILED) {
              if (input.length > commando$currPos) {
                s3 = input.charAt(commando$currPos);
                commando$currPos++;
              } else {
                s3 = commando$FAILED;
                if (commando$silentFails === 0) { commando$fail(commando$c84); }
              }
              if (s3 !== commando$FAILED) {
                commando$reportedPos = s0;
                s1 = commando$c104(s3);
                s0 = s1;
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsezeroEscapeSequence() {
          var s0, s1, s2, s3;
    
          s0 = commando$currPos;
          if (input.substr(commando$currPos, 2) === commando$c105) {
            s1 = commando$c105;
            commando$currPos += 2;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c106); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$currPos;
            commando$silentFails++;
            s3 = commando$parsedigit();
            commando$silentFails--;
            if (s3 === commando$FAILED) {
              s2 = commando$c18;
            } else {
              commando$currPos = s2;
              s2 = commando$c0;
            }
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c107();
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsehexEscapeSequence() {
          var s0, s1, s2, s3, s4, s5;
    
          s0 = commando$currPos;
          if (input.substr(commando$currPos, 2) === commando$c108) {
            s1 = commando$c108;
            commando$currPos += 2;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c109); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$currPos;
            s3 = commando$currPos;
            s4 = commando$parsehexDigit();
            if (s4 !== commando$FAILED) {
              s5 = commando$parsehexDigit();
              if (s5 !== commando$FAILED) {
                s4 = [s4, s5];
                s3 = s4;
              } else {
                commando$currPos = s3;
                s3 = commando$c0;
              }
            } else {
              commando$currPos = s3;
              s3 = commando$c0;
            }
            if (s3 !== commando$FAILED) {
              s3 = input.substring(s2, commando$currPos);
            }
            s2 = s3;
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c110(s2);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parseunicodeEscapeSequence() {
          var s0, s1, s2, s3, s4, s5, s6, s7;
    
          s0 = commando$currPos;
          if (input.substr(commando$currPos, 2) === commando$c111) {
            s1 = commando$c111;
            commando$currPos += 2;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c112); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$currPos;
            s3 = commando$currPos;
            s4 = commando$parsehexDigit();
            if (s4 !== commando$FAILED) {
              s5 = commando$parsehexDigit();
              if (s5 !== commando$FAILED) {
                s6 = commando$parsehexDigit();
                if (s6 !== commando$FAILED) {
                  s7 = commando$parsehexDigit();
                  if (s7 !== commando$FAILED) {
                    s4 = [s4, s5, s6, s7];
                    s3 = s4;
                  } else {
                    commando$currPos = s3;
                    s3 = commando$c0;
                  }
                } else {
                  commando$currPos = s3;
                  s3 = commando$c0;
                }
              } else {
                commando$currPos = s3;
                s3 = commando$c0;
              }
            } else {
              commando$currPos = s3;
              s3 = commando$c0;
            }
            if (s3 !== commando$FAILED) {
              s3 = input.substring(s2, commando$currPos);
            }
            s2 = s3;
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c110(s2);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parseeolEscapeSequence() {
          var s0, s1, s2;
    
          s0 = commando$currPos;
          if (input.charCodeAt(commando$currPos) === 92) {
            s1 = commando$c82;
            commando$currPos++;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c83); }
          }
          if (s1 !== commando$FAILED) {
            s2 = commando$parseeol();
            if (s2 !== commando$FAILED) {
              commando$reportedPos = s0;
              s1 = commando$c113(s2);
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsedigit() {
          var s0;
    
          if (commando$c114.test(input.charAt(commando$currPos))) {
            s0 = input.charAt(commando$currPos);
            commando$currPos++;
          } else {
            s0 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c115); }
          }
    
          return s0;
        }
    
        function commando$parsehexDigit() {
          var s0;
    
          if (commando$c116.test(input.charAt(commando$currPos))) {
            s0 = input.charAt(commando$currPos);
            commando$currPos++;
          } else {
            s0 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c117); }
          }
    
          return s0;
        }
    
        function commando$parseletter() {
          var s0;
    
          s0 = commando$parselowerCaseLetter();
          if (s0 === commando$FAILED) {
            s0 = commando$parseupperCaseLetter();
          }
    
          return s0;
        }
    
        function commando$parselowerCaseLetter() {
          var s0;
    
          if (commando$c118.test(input.charAt(commando$currPos))) {
            s0 = input.charAt(commando$currPos);
            commando$currPos++;
          } else {
            s0 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c119); }
          }
    
          return s0;
        }
    
        function commando$parseupperCaseLetter() {
          var s0;
    
          if (commando$c120.test(input.charAt(commando$currPos))) {
            s0 = input.charAt(commando$currPos);
            commando$currPos++;
          } else {
            s0 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c121); }
          }
    
          return s0;
        }
    
        function commando$parse__() {
          var s0, s1;
    
          s0 = [];
          s1 = commando$parsewhitespace();
          if (s1 === commando$FAILED) {
            s1 = commando$parseeol();
            if (s1 === commando$FAILED) {
              s1 = commando$parsecomment();
            }
          }
          while (s1 !== commando$FAILED) {
            s0.push(s1);
            s1 = commando$parsewhitespace();
            if (s1 === commando$FAILED) {
              s1 = commando$parseeol();
              if (s1 === commando$FAILED) {
                s1 = commando$parsecomment();
              }
            }
          }
    
          return s0;
        }
    
        function commando$parsecomment() {
          var s0, s1;
    
          commando$silentFails++;
          s0 = commando$parsesingleLineComment();
          if (s0 === commando$FAILED) {
            s0 = commando$parsemultiLineComment();
          }
          commando$silentFails--;
          if (s0 === commando$FAILED) {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c122); }
          }
    
          return s0;
        }
    
        function commando$parsesingleLineComment() {
          var s0, s1, s2, s3, s4, s5;
    
          s0 = commando$currPos;
          if (input.substr(commando$currPos, 2) === commando$c123) {
            s1 = commando$c123;
            commando$currPos += 2;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c124); }
          }
          if (s1 !== commando$FAILED) {
            s2 = [];
            s3 = commando$currPos;
            s4 = commando$currPos;
            commando$silentFails++;
            s5 = commando$parseeolChar();
            commando$silentFails--;
            if (s5 === commando$FAILED) {
              s4 = commando$c18;
            } else {
              commando$currPos = s4;
              s4 = commando$c0;
            }
            if (s4 !== commando$FAILED) {
              if (input.length > commando$currPos) {
                s5 = input.charAt(commando$currPos);
                commando$currPos++;
              } else {
                s5 = commando$FAILED;
                if (commando$silentFails === 0) { commando$fail(commando$c84); }
              }
              if (s5 !== commando$FAILED) {
                s4 = [s4, s5];
                s3 = s4;
              } else {
                commando$currPos = s3;
                s3 = commando$c0;
              }
            } else {
              commando$currPos = s3;
              s3 = commando$c0;
            }
            while (s3 !== commando$FAILED) {
              s2.push(s3);
              s3 = commando$currPos;
              s4 = commando$currPos;
              commando$silentFails++;
              s5 = commando$parseeolChar();
              commando$silentFails--;
              if (s5 === commando$FAILED) {
                s4 = commando$c18;
              } else {
                commando$currPos = s4;
                s4 = commando$c0;
              }
              if (s4 !== commando$FAILED) {
                if (input.length > commando$currPos) {
                  s5 = input.charAt(commando$currPos);
                  commando$currPos++;
                } else {
                  s5 = commando$FAILED;
                  if (commando$silentFails === 0) { commando$fail(commando$c84); }
                }
                if (s5 !== commando$FAILED) {
                  s4 = [s4, s5];
                  s3 = s4;
                } else {
                  commando$currPos = s3;
                  s3 = commando$c0;
                }
              } else {
                commando$currPos = s3;
                s3 = commando$c0;
              }
            }
            if (s2 !== commando$FAILED) {
              s1 = [s1, s2];
              s0 = s1;
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parsemultiLineComment() {
          var s0, s1, s2, s3, s4, s5;
    
          s0 = commando$currPos;
          if (input.substr(commando$currPos, 2) === commando$c125) {
            s1 = commando$c125;
            commando$currPos += 2;
          } else {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c126); }
          }
          if (s1 !== commando$FAILED) {
            s2 = [];
            s3 = commando$currPos;
            s4 = commando$currPos;
            commando$silentFails++;
            if (input.substr(commando$currPos, 2) === commando$c127) {
              s5 = commando$c127;
              commando$currPos += 2;
            } else {
              s5 = commando$FAILED;
              if (commando$silentFails === 0) { commando$fail(commando$c128); }
            }
            commando$silentFails--;
            if (s5 === commando$FAILED) {
              s4 = commando$c18;
            } else {
              commando$currPos = s4;
              s4 = commando$c0;
            }
            if (s4 !== commando$FAILED) {
              if (input.length > commando$currPos) {
                s5 = input.charAt(commando$currPos);
                commando$currPos++;
              } else {
                s5 = commando$FAILED;
                if (commando$silentFails === 0) { commando$fail(commando$c84); }
              }
              if (s5 !== commando$FAILED) {
                s4 = [s4, s5];
                s3 = s4;
              } else {
                commando$currPos = s3;
                s3 = commando$c0;
              }
            } else {
              commando$currPos = s3;
              s3 = commando$c0;
            }
            while (s3 !== commando$FAILED) {
              s2.push(s3);
              s3 = commando$currPos;
              s4 = commando$currPos;
              commando$silentFails++;
              if (input.substr(commando$currPos, 2) === commando$c127) {
                s5 = commando$c127;
                commando$currPos += 2;
              } else {
                s5 = commando$FAILED;
                if (commando$silentFails === 0) { commando$fail(commando$c128); }
              }
              commando$silentFails--;
              if (s5 === commando$FAILED) {
                s4 = commando$c18;
              } else {
                commando$currPos = s4;
                s4 = commando$c0;
              }
              if (s4 !== commando$FAILED) {
                if (input.length > commando$currPos) {
                  s5 = input.charAt(commando$currPos);
                  commando$currPos++;
                } else {
                  s5 = commando$FAILED;
                  if (commando$silentFails === 0) { commando$fail(commando$c84); }
                }
                if (s5 !== commando$FAILED) {
                  s4 = [s4, s5];
                  s3 = s4;
                } else {
                  commando$currPos = s3;
                  s3 = commando$c0;
                }
              } else {
                commando$currPos = s3;
                s3 = commando$c0;
              }
            }
            if (s2 !== commando$FAILED) {
              if (input.substr(commando$currPos, 2) === commando$c127) {
                s3 = commando$c127;
                commando$currPos += 2;
              } else {
                s3 = commando$FAILED;
                if (commando$silentFails === 0) { commando$fail(commando$c128); }
              }
              if (s3 !== commando$FAILED) {
                s1 = [s1, s2, s3];
                s0 = s1;
              } else {
                commando$currPos = s0;
                s0 = commando$c0;
              }
            } else {
              commando$currPos = s0;
              s0 = commando$c0;
            }
          } else {
            commando$currPos = s0;
            s0 = commando$c0;
          }
    
          return s0;
        }
    
        function commando$parseeol() {
          var s0, s1;
    
          commando$silentFails++;
          if (input.charCodeAt(commando$currPos) === 10) {
            s0 = commando$c130;
            commando$currPos++;
          } else {
            s0 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c131); }
          }
          if (s0 === commando$FAILED) {
            if (input.substr(commando$currPos, 2) === commando$c132) {
              s0 = commando$c132;
              commando$currPos += 2;
            } else {
              s0 = commando$FAILED;
              if (commando$silentFails === 0) { commando$fail(commando$c133); }
            }
            if (s0 === commando$FAILED) {
              if (input.charCodeAt(commando$currPos) === 13) {
                s0 = commando$c134;
                commando$currPos++;
              } else {
                s0 = commando$FAILED;
                if (commando$silentFails === 0) { commando$fail(commando$c135); }
              }
              if (s0 === commando$FAILED) {
                if (input.charCodeAt(commando$currPos) === 8232) {
                  s0 = commando$c136;
                  commando$currPos++;
                } else {
                  s0 = commando$FAILED;
                  if (commando$silentFails === 0) { commando$fail(commando$c137); }
                }
                if (s0 === commando$FAILED) {
                  if (input.charCodeAt(commando$currPos) === 8233) {
                    s0 = commando$c138;
                    commando$currPos++;
                  } else {
                    s0 = commando$FAILED;
                    if (commando$silentFails === 0) { commando$fail(commando$c139); }
                  }
                }
              }
            }
          }
          commando$silentFails--;
          if (s0 === commando$FAILED) {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c129); }
          }
    
          return s0;
        }
    
        function commando$parseeolChar() {
          var s0;
    
          if (commando$c140.test(input.charAt(commando$currPos))) {
            s0 = input.charAt(commando$currPos);
            commando$currPos++;
          } else {
            s0 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c141); }
          }
    
          return s0;
        }
    
        function commando$parsewhitespace() {
          var s0, s1;
    
          commando$silentFails++;
          if (commando$c143.test(input.charAt(commando$currPos))) {
            s0 = input.charAt(commando$currPos);
            commando$currPos++;
          } else {
            s0 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c144); }
          }
          commando$silentFails--;
          if (s0 === commando$FAILED) {
            s1 = commando$FAILED;
            if (commando$silentFails === 0) { commando$fail(commando$c142); }
          }
    
          return s0;
        }
    
    
          var utils = require("./utils");
    
    
        commando$result = commando$startRuleFunction();
    
        if (commando$result !== commando$FAILED && commando$currPos === input.length) {
          return commando$result;
        } else {
          if (commando$result !== commando$FAILED && commando$currPos < input.length) {
            commando$fail({ type: "end", description: "end of input" });
          }
    
          throw commando$buildException(null, commando$maxFailExpected, commando$maxFailPos);
        }
      }
    
      return {
        SyntaxError: SyntaxError,
        parse:       parse
      };
    })();
  });

  modules.define("compiler/opcodes", function(module, require) {
    /* Bytecode instruction opcodes. */
    module.exports = {
      /* Stack Manipulation */
    
      PUSH:             0,    // PUSH c
      PUSH_CURR_POS:    1,    // PUSH_CURR_POS
      POP:              2,    // POP
      POP_CURR_POS:     3,    // POP_CURR_POS
      POP_N:            4,    // POP_N n
      NIP:              5,    // NIP
      APPEND:           6,    // APPEND
      WRAP:             7,    // WRAP n
      TEXT:             8,    // TEXT
    
      /* Conditions and Loops */
    
      IF:               9,    // IF t, f
      IF_ERROR:         10,   // IF_ERROR t, f
      IF_NOT_ERROR:     11,   // IF_NOT_ERROR t, f
      WHILE_NOT_ERROR:  12,   // WHILE_NOT_ERROR b
    
      /* Matching */
    
      MATCH_ANY:        13,   // MATCH_ANY a, f, ...
      MATCH_STRING:     14,   // MATCH_STRING s, a, f, ...
      MATCH_STRING_IC:  15,   // MATCH_STRING_IC s, a, f, ...
      MATCH_REGEXP:     16,   // MATCH_REGEXP r, a, f, ...
      ACCEPT_N:         17,   // ACCEPT_N n
      ACCEPT_STRING:    18,   // ACCEPT_STRING s
      FAIL:             19,   // FAIL e
    
      /* Calls */
    
      REPORT_SAVED_POS: 20,   // REPORT_SAVED_POS p
      REPORT_CURR_POS:  21,   // REPORT_CURR_POS
      CALL:             22,   // CALL f, n, pc, p1, p2, ..., pN
    
      /* Rules */
    
      RULE:             23,   // RULE r
    
      /* Failure Reporting */
    
      SILENT_FAILS_ON:  24,   // SILENT_FAILS_ON
      SILENT_FAILS_OFF: 25    // SILENT_FAILS_FF
    };
  });

  modules.define("compiler/passes/generate-bytecode", function(module, require) {
    var utils = require("../../utils"),
        op    = require("../opcodes");
    
    /* Generates bytecode.
     *
     * Instructions
     * ============
     *
     * Stack Manipulation
     * ------------------
     *
     *  [0] PUSH c
     *
     *        stack.push(consts[c]);
     *
     *  [1] PUSH_CURR_POS
     *
     *        stack.push(currPos);
     *
     *  [2] POP
     *
     *        stack.pop();
     *
     *  [3] POP_CURR_POS
     *
     *        currPos = stack.pop();
     *
     *  [4] POP_N n
     *
     *        stack.pop(n);
     *
     *  [5] NIP
     *
     *        value = stack.pop();
     *        stack.pop();
     *        stack.push(value);
     *
     *  [6] APPEND
     *
     *        value = stack.pop();
     *        array = stack.pop();
     *        array.push(value);
     *        stack.push(array);
     *
     *  [7] WRAP n
     *
     *        stack.push(stack.pop(n));
     *
     *  [8] TEXT
     *
     *        stack.pop();
     *        stack.push(input.substring(stack.top(), currPos));
     *
     * Conditions and Loops
     * --------------------
     *
     *  [9] IF t, f
     *
     *        if (stack.top()) {
     *          interpret(ip + 3, ip + 3 + t);
     *        } else {
     *          interpret(ip + 3 + t, ip + 3 + t + f);
     *        }
     *
     * [10] IF_ERROR t, f
     *
     *        if (stack.top() === FAILED) {
     *          interpret(ip + 3, ip + 3 + t);
     *        } else {
     *          interpret(ip + 3 + t, ip + 3 + t + f);
     *        }
     *
     * [11] IF_NOT_ERROR t, f
     *
     *        if (stack.top() !== FAILED) {
     *          interpret(ip + 3, ip + 3 + t);
     *        } else {
     *          interpret(ip + 3 + t, ip + 3 + t + f);
     *        }
     *
     * [12] WHILE_NOT_ERROR b
     *
     *        while(stack.top() !== FAILED) {
     *          interpret(ip + 2, ip + 2 + b);
     *        }
     *
     * Matching
     * --------
     *
     * [13] MATCH_ANY a, f, ...
     *
     *        if (input.length > currPos) {
     *          interpret(ip + 3, ip + 3 + a);
     *        } else {
     *          interpret(ip + 3 + a, ip + 3 + a + f);
     *        }
     *
     * [14] MATCH_STRING s, a, f, ...
     *
     *        if (input.substr(currPos, consts[s].length) === consts[s]) {
     *          interpret(ip + 4, ip + 4 + a);
     *        } else {
     *          interpret(ip + 4 + a, ip + 4 + a + f);
     *        }
     *
     * [15] MATCH_STRING_IC s, a, f, ...
     *
     *        if (input.substr(currPos, consts[s].length).toLowerCase() === consts[s]) {
     *          interpret(ip + 4, ip + 4 + a);
     *        } else {
     *          interpret(ip + 4 + a, ip + 4 + a + f);
     *        }
     *
     * [16] MATCH_REGEXP r, a, f, ...
     *
     *        if (consts[r].test(input.charAt(currPos))) {
     *          interpret(ip + 4, ip + 4 + a);
     *        } else {
     *          interpret(ip + 4 + a, ip + 4 + a + f);
     *        }
     *
     * [17] ACCEPT_N n
     *
     *        stack.push(input.substring(currPos, n));
     *        currPos += n;
     *
     * [18] ACCEPT_STRING s
     *
     *        stack.push(consts[s]);
     *        currPos += consts[s].length;
     *
     * [19] FAIL e
     *
     *        stack.push(FAILED);
     *        fail(consts[e]);
     *
     * Calls
     * -----
     *
     * [20] REPORT_SAVED_POS p
     *
     *        reportedPos = stack[p];
     *
     * [21] REPORT_CURR_POS
     *
     *        reportedPos = currPos;
     *
     * [22] CALL f, n, pc, p1, p2, ..., pN
     *
     *        value = consts[f](stack[p1], ..., stack[pN]);
     *        stack.pop(n);
     *        stack.push(value);
     *
     * Rules
     * -----
     *
     * [23] RULE r
     *
     *        stack.push(parseRule(r));
     *
     * Failure Reporting
     * -----------------
     *
     * [24] SILENT_FAILS_ON
     *
     *        silentFails++;
     *
     * [25] SILENT_FAILS_OFF
     *
     *        silentFails--;
     */
    module.exports = function(ast) {
      var consts = [];
    
      function addConst(value) {
        var index = utils.indexOf(consts, function(c) { return c === value; });
    
        return index === -1 ? consts.push(value) - 1 : index;
      }
    
      function addFunctionConst(params, code) {
        return addConst(
          "function(" + params.join(", ") + ") {" + code + "}"
        );
      }
    
      function buildSequence() {
        return Array.prototype.concat.apply([], arguments);
      }
    
      function buildCondition(condCode, thenCode, elseCode) {
        return condCode.concat(
          [thenCode.length, elseCode.length],
          thenCode,
          elseCode
        );
      }
    
      function buildLoop(condCode, bodyCode) {
        return condCode.concat([bodyCode.length], bodyCode);
      }
    
      function buildCall(functionIndex, delta, env, sp) {
        var params = utils.map( utils.values(env), function(p) { return sp - p; });
    
        return [op.CALL, functionIndex, delta, params.length].concat(params);
      }
    
      function buildSimplePredicate(expression, negative, context) {
        var undefinedIndex = addConst('void 0'),
            failedIndex    = addConst('commando$FAILED');
    
        return buildSequence(
          [op.PUSH_CURR_POS],
          [op.SILENT_FAILS_ON],
          generate(expression, {
            sp:     context.sp + 1,
            env:    { },
            action: null
          }),
          [op.SILENT_FAILS_OFF],
          buildCondition(
            [negative ? op.IF_ERROR : op.IF_NOT_ERROR],
            buildSequence(
              [op.POP],
              [negative ? op.POP : op.POP_CURR_POS],
              [op.PUSH, undefinedIndex]
            ),
            buildSequence(
              [op.POP],
              [negative ? op.POP_CURR_POS : op.POP],
              [op.PUSH, failedIndex]
            )
          )
        );
      }
    
      function buildSemanticPredicate(code, negative, context) {
        var functionIndex  = addFunctionConst(utils.keys(context.env), code),
            undefinedIndex = addConst('void 0'),
            failedIndex    = addConst('commando$FAILED');
    
        return buildSequence(
          [op.REPORT_CURR_POS],
          buildCall(functionIndex, 0, context.env, context.sp),
          buildCondition(
            [op.IF],
            buildSequence(
              [op.POP],
              [op.PUSH, negative ? failedIndex : undefinedIndex]
            ),
            buildSequence(
              [op.POP],
              [op.PUSH, negative ? undefinedIndex : failedIndex]
            )
          )
        );
      }
    
      function buildAppendLoop(expressionCode) {
        return buildLoop(
          [op.WHILE_NOT_ERROR],
          buildSequence([op.APPEND], expressionCode)
        );
      }
    
      var generate = utils.buildNodeVisitor({
        grammar: function(node) {
          utils.each(node.rules, generate);
    
          node.consts = consts;
        },
    
        rule: function(node) {
          node.bytecode = generate(node.expression, {
            sp:     -1,  // stack pointer
            env:    { }, // mapping of label names to stack positions
            action: null // action nodes pass themselves to children here
          });
        },
    
        named: function(node, context) {
          var nameIndex = addConst(
            '{ type: "other", description: ' + utils.quote(node.name) + ' }'
          );
    
          /*
           * The code generated below is slightly suboptimal because |FAIL| pushes
           * to the stack, so we need to stick a |POP| in front of it. We lack a
           * dedicated instruction that would just report the failure and not touch
           * the stack.
           */
          return buildSequence(
            [op.SILENT_FAILS_ON],
            generate(node.expression, context),
            [op.SILENT_FAILS_OFF],
            buildCondition([op.IF_ERROR], [op.FAIL, nameIndex], [])
          );
        },
    
        choice: function(node, context) {
          function buildAlternativesCode(alternatives, context) {
            return buildSequence(
              generate(alternatives[0], {
                sp:     context.sp,
                env:    { },
                action: null
              }),
              alternatives.length > 1
                ? buildCondition(
                    [op.IF_ERROR],
                    buildSequence(
                      [op.POP],
                      buildAlternativesCode(alternatives.slice(1), context)
                    ),
                    []
                  )
                : []
            );
          }
    
          return buildAlternativesCode(node.alternatives, context);
        },
    
        action: function(node, context) {
          var env            = { },
              emitCall       = node.expression.type !== "sequence"
                            || node.expression.elements.length === 0,
              expressionCode = generate(node.expression, {
                sp:     context.sp + (emitCall ? 1 : 0),
                env:    env,
                action: node
              }),
              functionIndex  = addFunctionConst(utils.keys(env), node.code);
    
          return emitCall
            ? buildSequence(
                [op.PUSH_CURR_POS],
                expressionCode,
                buildCondition(
                  [op.IF_NOT_ERROR],
                  buildSequence(
                    [op.REPORT_SAVED_POS, 1],
                    buildCall(functionIndex, 1, env, context.sp + 2)
                  ),
                  []
                ),
                [op.NIP]
              )
            : expressionCode;
        },
    
        sequence: function(node, context) {
          var emptyArrayIndex;
    
          function buildElementsCode(elements, context) {
            var processedCount, functionIndex;
    
            if (elements.length > 0) {
              processedCount = node.elements.length - elements.slice(1).length;
    
              return buildSequence(
                generate(elements[0], {
                  sp:     context.sp,
                  env:    context.env,
                  action: null
                }),
                buildCondition(
                  [op.IF_NOT_ERROR],
                  buildElementsCode(elements.slice(1), {
                    sp:     context.sp + 1,
                    env:    context.env,
                    action: context.action
                  }),
                  buildSequence(
                    processedCount > 1 ? [op.POP_N, processedCount] : [op.POP],
                    [op.POP_CURR_POS],
                    [op.PUSH, failedIndex]
                  )
                )
              );
            } else {
              if (context.action) {
                functionIndex = addFunctionConst(
                  utils.keys(context.env),
                  context.action.code
                );
    
                return buildSequence(
                  [op.REPORT_SAVED_POS, node.elements.length],
                  buildCall(
                    functionIndex,
                    node.elements.length,
                    context.env,
                    context.sp
                  ),
                  [op.NIP]
                );
              } else {
                return buildSequence([op.WRAP, node.elements.length], [op.NIP]);
              }
            }
          }
    
          if (node.elements.length > 0) {
            failedIndex = addConst('commando$FAILED');
    
            return buildSequence(
              [op.PUSH_CURR_POS],
              buildElementsCode(node.elements, {
                sp:     context.sp + 1,
                env:    context.env,
                action: context.action
              })
            );
          } else {
            emptyArrayIndex = addConst('[]');
    
            return [op.PUSH, emptyArrayIndex];
          }
        },
    
        labeled: function(node, context) {
          context.env[node.label] = context.sp + 1;
    
          return generate(node.expression, {
            sp:     context.sp,
            env:    { },
            action: null
          });
        },
    
        text: function(node, context) {
          return buildSequence(
            [op.PUSH_CURR_POS],
            generate(node.expression, {
              sp:     context.sp + 1,
              env:    { },
              action: null
            }),
            buildCondition([op.IF_NOT_ERROR], [op.TEXT], []),
            [op.NIP]
          );
        },
    
        simple_and: function(node, context) {
          return buildSimplePredicate(node.expression, false, context);
        },
    
        simple_not: function(node, context) {
          return buildSimplePredicate(node.expression, true, context);
        },
    
        semantic_and: function(node, context) {
          return buildSemanticPredicate(node.code, false, context);
        },
    
        semantic_not: function(node, context) {
          return buildSemanticPredicate(node.code, true, context);
        },
    
        optional: function(node, context) {
          var nullIndex = addConst('null');
    
          return buildSequence(
            generate(node.expression, {
              sp:     context.sp,
              env:    { },
              action: null
            }),
            buildCondition(
              [op.IF_ERROR],
              buildSequence([op.POP], [op.PUSH, nullIndex]),
              []
            )
          );
        },
    
        zero_or_more: function(node, context) {
          var emptyArrayIndex = addConst('[]');
              expressionCode  = generate(node.expression, {
                sp:     context.sp + 1,
                env:    { },
                action: null
              });
    
          return buildSequence(
            [op.PUSH, emptyArrayIndex],
            expressionCode,
            buildAppendLoop(expressionCode),
            [op.POP]
          );
        },
    
        one_or_more: function(node, context) {
          var emptyArrayIndex = addConst('[]');
              failedIndex     = addConst('commando$FAILED');
              expressionCode  = generate(node.expression, {
                sp:     context.sp + 1,
                env:    { },
                action: null
              });
    
          return buildSequence(
            [op.PUSH, emptyArrayIndex],
            expressionCode,
            buildCondition(
              [op.IF_NOT_ERROR],
              buildSequence(buildAppendLoop(expressionCode), [op.POP]),
              buildSequence([op.POP], [op.POP], [op.PUSH, failedIndex])
            )
          );
        },
    
        rule_ref: function(node) {
          return [op.RULE, utils.indexOfRuleByName(ast, node.name)];
        },
    
        literal: function(node) {
          var stringIndex, expectedIndex;
    
          if (node.value.length > 0) {
            stringIndex = addConst(node.ignoreCase
              ? utils.quote(node.value.toLowerCase())
              : utils.quote(node.value)
            );
            expectedIndex = addConst([
              '{',
              'type: "literal",',
              'value: ' + utils.quote(node.value) + ',',
              'description: ' + utils.quote(utils.quote(node.value)),
              '}'
            ].join(' '));
    
            /*
             * For case-sensitive strings the value must match the beginning of the
             * remaining input exactly. As a result, we can use |ACCEPT_STRING| and
             * save one |substr| call that would be needed if we used |ACCEPT_N|.
             */
            return buildCondition(
              node.ignoreCase
                ? [op.MATCH_STRING_IC, stringIndex]
                : [op.MATCH_STRING, stringIndex],
              node.ignoreCase
                ? [op.ACCEPT_N, node.value.length]
                : [op.ACCEPT_STRING, stringIndex],
              [op.FAIL, expectedIndex]
            );
          } else {
            stringIndex = addConst('""');
    
            return [op.PUSH, stringIndex];
          }
        },
    
        "class": function(node) {
          var regexp, regexpIndex, expectedIndex;
    
          if (node.parts.length > 0) {
            regexp = '/^['
              + (node.inverted ? '^' : '')
              + utils.map(node.parts, function(part) {
                  return part instanceof Array
                    ? utils.quoteForRegexpClass(part[0])
                      + '-'
                      + utils.quoteForRegexpClass(part[1])
                    : utils.quoteForRegexpClass(part);
                }).join('')
              + ']/' + (node.ignoreCase ? 'i' : '');
          } else {
            /*
             * IE considers regexps /[]/ and /[^]/ as syntactically invalid, so we
             * translate them into euqivalents it can handle.
             */
            regexp = node.inverted ? '/^[\\S\\s]/' : '/^(?!)/';
          }
    
          regexpIndex   = addConst(regexp);
          expectedIndex = addConst([
            '{',
            'type: "class",',
            'value: ' + utils.quote(node.rawText) + ',',
            'description: ' + utils.quote(node.rawText),
            '}'
          ].join(' '));
    
          return buildCondition(
            [op.MATCH_REGEXP, regexpIndex],
            [op.ACCEPT_N, 1],
            [op.FAIL, expectedIndex]
          );
        },
    
        any: function() {
          var expectedIndex = addConst('{ type: "any", description: "any character" }');
    
          return buildCondition(
            [op.MATCH_ANY],
            [op.ACCEPT_N, 1],
            [op.FAIL, expectedIndex]
          );
        }
      });
    
      generate(ast);
    };
  });

  modules.define("compiler/passes/generate-javascript", function(module, require) {
    var utils = require("../../utils"),
        op    = require("../opcodes");
    
    /* Generates parser JavaScript code. */
    module.exports = function(ast, options) {
      /* These only indent non-empty lines to avoid trailing whitespace. */
      function indent2(code)  { return code.replace(/^(.+)$/gm, '  $1');         }
      function indent4(code)  { return code.replace(/^(.+)$/gm, '    $1');       }
      function indent8(code)  { return code.replace(/^(.+)$/gm, '        $1');   }
      function indent10(code) { return code.replace(/^(.+)$/gm, '          $1'); }
    
      function generateTables() {
        if (options.optimize === "size") {
          return [
            'commando$consts = [',
               indent2(ast.consts.join(',\n')),
            '],',
            '',
            'commando$bytecode = [',
               indent2(utils.map(
                 ast.rules,
                 function(rule) {
                   return 'commando$decode('
                         + utils.quote(utils.map(
                             rule.bytecode,
                             function(b) { return String.fromCharCode(b + 32); }
                           ).join(''))
                         + ')';
                 }
               ).join(',\n')),
            '],'
          ].join('\n');
        } else {
          return utils.map(
            ast.consts,
            function(c, i) { return 'commando$c' + i + ' = ' + c + ','; }
          ).join('\n');
        }
      }
    
      function generateCacheHeader(ruleIndexCode) {
        return [
          'var key    = commando$currPos * ' + ast.rules.length + ' + ' + ruleIndexCode + ',',
          '    cached = commando$cache[key];',
          '',
          'if (cached) {',
          '  commando$currPos = cached.nextPos;',
          '  return cached.result;',
          '}',
          ''
        ].join('\n');
      }
    
      function generateCacheFooter(resultCode) {
        return [
          '',
          'commando$cache[key] = { nextPos: commando$currPos, result: ' + resultCode + ' };'
        ].join('\n');
      }
    
      function generateInterpreter() {
        var parts = [];
    
        function generateCondition(cond, argsLength) {
          var baseLength      = argsLength + 3,
              thenLengthCode = 'bc[ip + ' + (baseLength - 2) + ']',
              elseLengthCode = 'bc[ip + ' + (baseLength - 1) + ']';
    
          return [
            'ends.push(end);',
            'ips.push(ip + ' + baseLength + ' + ' + thenLengthCode + ' + ' + elseLengthCode + ');',
            '',
            'if (' + cond + ') {',
            '  end = ip + ' + baseLength + ' + ' + thenLengthCode + ';',
            '  ip += ' + baseLength + ';',
            '} else {',
            '  end = ip + ' + baseLength + ' + ' + thenLengthCode + ' + ' + elseLengthCode + ';',
            '  ip += ' + baseLength + ' + ' + thenLengthCode + ';',
            '}',
            '',
            'break;'
          ].join('\n');
        }
    
        function generateLoop(cond) {
          var baseLength     = 2,
              bodyLengthCode = 'bc[ip + ' + (baseLength - 1) + ']';
    
          return [
            'if (' + cond + ') {',
            '  ends.push(end);',
            '  ips.push(ip);',
            '',
            '  end = ip + ' + baseLength + ' + ' + bodyLengthCode + ';',
            '  ip += ' + baseLength + ';',
            '} else {',
            '  ip += ' + baseLength + ' + ' + bodyLengthCode + ';',
            '}',
            '',
            'break;'
          ].join('\n');
        }
    
        function generateCall() {
          var baseLength       = 4,
              paramsLengthCode = 'bc[ip + ' + (baseLength - 1) + ']';
    
          return [
            'params = bc.slice(ip + ' + baseLength + ', ip + ' + baseLength + ' + ' + paramsLengthCode + ');',
            'for (i = 0; i < ' + paramsLengthCode + '; i++) {',
            '  params[i] = stack[stack.length - 1 - params[i]];',
            '}',
            '',
            'stack.splice(',
            '  stack.length - bc[ip + 2],',
            '  bc[ip + 2],',
            '  commando$consts[bc[ip + 1]].apply(null, params)',
            ');',
            '',
            'ip += ' + baseLength + ' + ' + paramsLengthCode + ';',
            'break;'
          ].join('\n');
        }
    
        parts.push([
          'function commando$decode(s) {',
          '  var bc = new Array(s.length), i;',
          '',
          '  for (i = 0; i < s.length; i++) {',
          '    bc[i] = s.charCodeAt(i) - 32;',
          '  }',
          '',
          '  return bc;',
          '}',
          '',
          'function commando$parseRule(index) {',
          '  var bc    = commando$bytecode[index],',
          '      ip    = 0,',
          '      ips   = [],',
          '      end   = bc.length,',
          '      ends  = [],',
          '      stack = [],',
          '      params, i;',
          ''
        ].join('\n'));
    
        if (options.cache) {
          parts.push(indent2(generateCacheHeader('index')));
        }
    
        parts.push([
          '  function protect(object) {',
          '    return Object.prototype.toString.apply(object) === "[object Array]" ? [] : object;',
          '  }',
          '',
          /*
           * The point of the outer loop and the |ips| & |ends| stacks is to avoid
           * recursive calls for interpreting parts of bytecode. In other words, we
           * implement the |interpret| operation of the abstract machine without
           * function calls. Such calls would likely slow the parser down and more
           * importantly cause stack overflows for complex grammars.
           */
          '  while (true) {',
          '    while (ip < end) {',
          '      switch (bc[ip]) {',
          '        case ' + op.PUSH + ':',             // PUSH c
          /*
           * Hack: One of the constants can be an empty array. It needs to be cloned
           * because it can be modified later on the stack by |APPEND|.
           */
          '          stack.push(protect(commando$consts[bc[ip + 1]]));',
          '          ip += 2;',
          '          break;',
          '',
          '        case ' + op.PUSH_CURR_POS + ':',    // PUSH_CURR_POS
          '          stack.push(commando$currPos);',
          '          ip++;',
          '          break;',
          '',
          '        case ' + op.POP + ':',              // POP
          '          stack.pop();',
          '          ip++;',
          '          break;',
          '',
          '        case ' + op.POP_CURR_POS + ':',     // POP_CURR_POS
          '          commando$currPos = stack.pop();',
          '          ip++;',
          '          break;',
          '',
          '        case ' + op.POP_N + ':',            // POP_N n
          '          stack.length -= bc[ip + 1];',
          '          ip += 2;',
          '          break;',
          '',
          '        case ' + op.NIP + ':',              // NIP
          '          stack.splice(-2, 1);',
          '          ip++;',
          '          break;',
          '',
          '        case ' + op.APPEND + ':',           // APPEND
          '          stack[stack.length - 2].push(stack.pop());',
          '          ip++;',
          '          break;',
          '',
          '        case ' + op.WRAP + ':',             // WRAP n
          '          stack.push(stack.splice(stack.length - bc[ip + 1], bc[ip + 1]));',
          '          ip += 2;',
          '          break;',
          '',
          '        case ' + op.TEXT + ':',             // TEXT
          '          stack.pop();',
          '          stack.push(input.substring(stack[stack.length - 1], commando$currPos));',
          '          ip++;',
          '          break;',
          '',
          '        case ' + op.IF + ':',               // IF t, f
                     indent10(generateCondition('stack[stack.length - 1]', 0)),
          '',
          '        case ' + op.IF_ERROR + ':',         // IF_ERROR t, f
                     indent10(generateCondition(
                       'stack[stack.length - 1] === commando$FAILED',
                       0
                     )),
          '',
          '        case ' + op.IF_NOT_ERROR + ':',     // IF_NOT_ERROR t, f
                     indent10(
                       generateCondition('stack[stack.length - 1] !== commando$FAILED',
                       0
                     )),
          '',
          '        case ' + op.WHILE_NOT_ERROR + ':',  // WHILE_NOT_ERROR b
                     indent10(generateLoop('stack[stack.length - 1] !== commando$FAILED')),
          '',
          '        case ' + op.MATCH_ANY + ':',        // MATCH_ANY a, f, ...
                     indent10(generateCondition('input.length > commando$currPos', 0)),
          '',
          '        case ' + op.MATCH_STRING + ':',     // MATCH_STRING s, a, f, ...
                     indent10(generateCondition(
                       'input.substr(commando$currPos, commando$consts[bc[ip + 1]].length) === commando$consts[bc[ip + 1]]',
                       1
                     )),
          '',
          '        case ' + op.MATCH_STRING_IC + ':',  // MATCH_STRING_IC s, a, f, ...
                     indent10(generateCondition(
                       'input.substr(commando$currPos, commando$consts[bc[ip + 1]].length).toLowerCase() === commando$consts[bc[ip + 1]]',
                       1
                     )),
          '',
          '        case ' + op.MATCH_REGEXP + ':',     // MATCH_REGEXP r, a, f, ...
                     indent10(generateCondition(
                       'commando$consts[bc[ip + 1]].test(input.charAt(commando$currPos))',
                       1
                     )),
          '',
          '        case ' + op.ACCEPT_N + ':',         // ACCEPT_N n
          '          stack.push(input.substr(commando$currPos, bc[ip + 1]));',
          '          commando$currPos += bc[ip + 1];',
          '          ip += 2;',
          '          break;',
          '',
          '        case ' + op.ACCEPT_STRING + ':',    // ACCEPT_STRING s
          '          stack.push(commando$consts[bc[ip + 1]]);',
          '          commando$currPos += commando$consts[bc[ip + 1]].length;',
          '          ip += 2;',
          '          break;',
          '',
          '        case ' + op.FAIL + ':',             // FAIL e
          '          stack.push(commando$FAILED);',
          '          if (commando$silentFails === 0) {',
          '            commando$fail(commando$consts[bc[ip + 1]]);',
          '          }',
          '          ip += 2;',
          '          break;',
          '',
          '        case ' + op.REPORT_SAVED_POS + ':', // REPORT_SAVED_POS p
          '          commando$reportedPos = stack[stack.length - 1 - bc[ip + 1]];',
          '          ip += 2;',
          '          break;',
          '',
          '        case ' + op.REPORT_CURR_POS + ':',  // REPORT_CURR_POS
          '          commando$reportedPos = commando$currPos;',
          '          ip++;',
          '          break;',
          '',
          '        case ' + op.CALL + ':',             // CALL f, n, pc, p1, p2, ..., pN
                     indent10(generateCall()),
          '',
          '        case ' + op.RULE + ':',             // RULE r
          '          stack.push(commando$parseRule(bc[ip + 1]));',
          '          ip += 2;',
          '          break;',
          '',
          '        case ' + op.SILENT_FAILS_ON + ':',  // SILENT_FAILS_ON
          '          commando$silentFails++;',
          '          ip++;',
          '          break;',
          '',
          '        case ' + op.SILENT_FAILS_OFF + ':', // SILENT_FAILS_OFF
          '          commando$silentFails--;',
          '          ip++;',
          '          break;',
          '',
          '        default:',
          '          throw new Error("Invalid opcode: " + bc[ip] + ".");',
          '      }',
          '    }',
          '',
          '    if (ends.length > 0) {',
          '      end = ends.pop();',
          '      ip = ips.pop();',
          '    } else {',
          '      break;',
          '    }',
          '  }'
        ].join('\n'));
    
        if (options.cache) {
          parts.push(indent2(generateCacheFooter('stack[0]')));
        }
    
        parts.push([
          '',
          '  return stack[0];',
          '}'
        ].join('\n'));
    
        return parts.join('\n');
      }
    
      function generateRuleFunction(rule) {
        var parts = [], code;
    
        function c(i) { return "commando$c" + i; } // |consts[i]| of the abstract machine
        function s(i) { return "s"     + i; } // |stack[i]| of the abstract machine
    
        var stack = {
              sp:    -1,
              maxSp: -1,
    
              push: function(exprCode) {
                var code = s(++this.sp) + ' = ' + exprCode + ';';
    
                if (this.sp > this.maxSp) { this.maxSp = this.sp; }
    
                return code;
              },
    
              pop: function() {
                var n, values;
    
                if (arguments.length === 0) {
                  return s(this.sp--);
                } else {
                  n = arguments[0];
                  values = utils.map(utils.range(this.sp - n + 1, this.sp + 1), s);
                  this.sp -= n;
    
                  return values;
                }
              },
    
              top: function() {
                return s(this.sp);
              },
    
              index: function(i) {
                return s(this.sp - i);
              }
            };
    
        function compile(bc) {
          var ip    = 0,
              end   = bc.length,
              parts = [],
              value;
    
          function compileCondition(cond, argCount) {
            var baseLength = argCount + 3,
                thenLength = bc[ip + baseLength - 2],
                elseLength = bc[ip + baseLength - 1],
                baseSp     = stack.sp,
                thenCode, elseCode, thenSp, elseSp;
    
            ip += baseLength;
            thenCode = compile(bc.slice(ip, ip + thenLength));
            thenSp = stack.sp;
            ip += thenLength;
    
            if (elseLength > 0) {
              stack.sp = baseSp;
              elseCode = compile(bc.slice(ip, ip + elseLength));
              elseSp = stack.sp;
              ip += elseLength;
    
              if (thenSp !== elseSp) {
                throw new Error(
                  "Branches of a condition must move the stack pointer in the same way."
                );
              }
            }
    
            parts.push('if (' + cond + ') {');
            parts.push(indent2(thenCode));
            if (elseLength > 0) {
              parts.push('} else {');
              parts.push(indent2(elseCode));
            }
            parts.push('}');
          }
    
          function compileLoop(cond) {
            var baseLength = 2,
                bodyLength = bc[ip + baseLength - 1],
                baseSp     = stack.sp,
                bodyCode, bodySp;
    
            ip += baseLength;
            bodyCode = compile(bc.slice(ip, ip + bodyLength));
            bodySp = stack.sp;
            ip += bodyLength;
    
            if (bodySp !== baseSp) {
              throw new Error("Body of a loop can't move the stack pointer.");
            }
    
            parts.push('while (' + cond + ') {');
            parts.push(indent2(bodyCode));
            parts.push('}');
          }
    
          function compileCall() {
            var baseLength   = 4,
                paramsLength = bc[ip + baseLength - 1];
    
            var value = c(bc[ip + 1]) + '('
                  + utils.map(
                      bc.slice(ip + baseLength, ip + baseLength + paramsLength),
                      stackIndex
                    ).join(', ')
                  + ')';
            stack.pop(bc[ip + 2]);
            parts.push(stack.push(value));
            ip += baseLength + paramsLength;
          }
    
          /*
           * Extracted into a function just to silence JSHint complaining about
           * creating functions in a loop.
           */
          function stackIndex(p) {
            return stack.index(p);
          }
    
          while (ip < end) {
            switch (bc[ip]) {
              case op.PUSH:             // PUSH c
                /*
                 * Hack: One of the constants can be an empty array. It needs to be
                 * handled specially because it can be modified later on the stack
                 * by |APPEND|.
                 */
                parts.push(
                  stack.push(ast.consts[bc[ip + 1]] === "[]" ? "[]" : c(bc[ip + 1]))
                );
                ip += 2;
                break;
    
              case op.PUSH_CURR_POS:    // PUSH_CURR_POS
                parts.push(stack.push('commando$currPos'));
                ip++;
                break;
    
              case op.POP:              // POP
                stack.pop();
                ip++;
                break;
    
              case op.POP_CURR_POS:     // POP_CURR_POS
                parts.push('commando$currPos = ' + stack.pop() + ';');
                ip++;
                break;
    
              case op.POP_N:            // POP_N n
                stack.pop(bc[ip + 1]);
                ip += 2;
                break;
    
              case op.NIP:              // NIP
                value = stack.pop();
                stack.pop();
                parts.push(stack.push(value));
                ip++;
                break;
    
              case op.APPEND:           // APPEND
                value = stack.pop();
                parts.push(stack.top() + '.push(' + value + ');');
                ip++;
                break;
    
              case op.WRAP:             // WRAP n
                parts.push(
                  stack.push('[' + stack.pop(bc[ip + 1]).join(', ') + ']')
                );
                ip += 2;
                break;
    
              case op.TEXT:             // TEXT
                stack.pop();
                parts.push(
                  stack.push('input.substring(' + stack.top() + ', commando$currPos)')
                );
                ip++;
                break;
    
              case op.IF:               // IF t, f
                compileCondition(stack.top(), 0);
                break;
    
              case op.IF_ERROR:         // IF_ERROR t, f
                compileCondition(stack.top() + ' === commando$FAILED', 0);
                break;
    
              case op.IF_NOT_ERROR:     // IF_NOT_ERROR t, f
                compileCondition(stack.top() + ' !== commando$FAILED', 0);
                break;
    
              case op.WHILE_NOT_ERROR:  // WHILE_NOT_ERROR b
                compileLoop(stack.top() + ' !== commando$FAILED', 0);
                break;
    
              case op.MATCH_ANY:        // MATCH_ANY a, f, ...
                compileCondition('input.length > commando$currPos', 0);
                break;
    
              case op.MATCH_STRING:     // MATCH_STRING s, a, f, ...
                compileCondition(
                  eval(ast.consts[bc[ip + 1]]).length > 1
                    ? 'input.substr(commando$currPos, '
                        + eval(ast.consts[bc[ip + 1]]).length
                        + ') === '
                        + c(bc[ip + 1])
                    : 'input.charCodeAt(commando$currPos) === '
                        + eval(ast.consts[bc[ip + 1]]).charCodeAt(0),
                  1
                );
                break;
    
              case op.MATCH_STRING_IC:  // MATCH_STRING_IC s, a, f, ...
                compileCondition(
                  'input.substr(commando$currPos, '
                    + eval(ast.consts[bc[ip + 1]]).length
                    + ').toLowerCase() === '
                    + c(bc[ip + 1]),
                  1
                );
                break;
    
              case op.MATCH_REGEXP:     // MATCH_REGEXP r, a, f, ...
                compileCondition(
                  c(bc[ip + 1]) + '.test(input.charAt(commando$currPos))',
                  1
                );
                break;
    
              case op.ACCEPT_N:         // ACCEPT_N n
                parts.push(stack.push(
                  bc[ip + 1] > 1
                    ? 'input.substr(commando$currPos, ' + bc[ip + 1] + ')'
                    : 'input.charAt(commando$currPos)'
                ));
                parts.push(
                  bc[ip + 1] > 1
                    ? 'commando$currPos += ' + bc[ip + 1] + ';'
                    : 'commando$currPos++;'
                );
                ip += 2;
                break;
    
              case op.ACCEPT_STRING:    // ACCEPT_STRING s
                parts.push(stack.push(c(bc[ip + 1])));
                parts.push(
                  eval(ast.consts[bc[ip + 1]]).length > 1
                    ? 'commando$currPos += ' + eval(ast.consts[bc[ip + 1]]).length + ';'
                    : 'commando$currPos++;'
                );
                ip += 2;
                break;
    
              case op.FAIL:             // FAIL e
                parts.push(stack.push('commando$FAILED'));
                parts.push('if (commando$silentFails === 0) { commando$fail(' + c(bc[ip + 1]) + '); }');
                ip += 2;
                break;
    
              case op.REPORT_SAVED_POS: // REPORT_SAVED_POS p
                parts.push('commando$reportedPos = ' + stack.index(bc[ip + 1]) + ';');
                ip += 2;
                break;
    
              case op.REPORT_CURR_POS:  // REPORT_CURR_POS
                parts.push('commando$reportedPos = commando$currPos;');
                ip++;
                break;
    
              case op.CALL:             // CALL f, n, pc, p1, p2, ..., pN
                compileCall();
                break;
    
              case op.RULE:             // RULE r
                parts.push(stack.push("commando$parse" + ast.rules[bc[ip + 1]].name + "()"));
                ip += 2;
                break;
    
              case op.SILENT_FAILS_ON:  // SILENT_FAILS_ON
                parts.push('commando$silentFails++;');
                ip++;
                break;
    
              case op.SILENT_FAILS_OFF: // SILENT_FAILS_OFF
                parts.push('commando$silentFails--;');
                ip++;
                break;
    
              default:
                throw new Error("Invalid opcode: " + bc[ip] + ".");
            }
          }
    
          return parts.join('\n');
        }
    
        code = compile(rule.bytecode);
    
        parts.push([
          'function commando$parse' + rule.name + '() {',
          '  var ' + utils.map(utils.range(0, stack.maxSp + 1), s).join(', ') + ';',
          ''
        ].join('\n'));
    
        if (options.cache) {
          parts.push(indent2(
            generateCacheHeader(utils.indexOfRuleByName(ast, rule.name))
          ));
        }
    
        parts.push(indent2(code));
    
        if (options.cache) {
          parts.push(indent2(generateCacheFooter(s(0))));
        }
    
        parts.push([
          '',
          '  return ' + s(0) + ';',
          '}'
        ].join('\n'));
    
        return parts.join('\n');
      }
    
      var parts = [],
          startRuleIndices,   startRuleIndex,
          startRuleFunctions, startRuleFunction;
    
      parts.push([
        '(function() {',
        '  function commando$subclass(child, parent) {',
        '    function ctor() { this.constructor = child; }',
        '    ctor.prototype = parent.prototype;',
        '    child.prototype = new ctor();',
        '  }',
        '',
        '  function SyntaxError(message, expected, found, offset, line, column) {',
        '    this.message  = message;',
        '    this.expected = expected;',
        '    this.found    = found;',
        '    this.offset   = offset;',
        '    this.line     = line;',
        '    this.column   = column;',
        '',
        '    this.name     = "SyntaxError";',
        '  }',
        '',
        '  commando$subclass(SyntaxError, Error);',
        '',
        '  function parse(input) {',
        '    var options = arguments.length > 1 ? arguments[1] : {},',
        '',
        '        commando$FAILED = {},',
        ''
      ].join('\n'));
    
      if (options.optimize === "size") {
        startRuleIndices = '{ '
                         + utils.map(
                             options.allowedStartRules,
                             function(r) { return r + ': ' + utils.indexOfRuleByName(ast, r); }
                           ).join(', ')
                         + ' }';
        startRuleIndex = utils.indexOfRuleByName(ast, options.allowedStartRules[0]);
    
        parts.push([
          '        commando$startRuleIndices = ' + startRuleIndices + ',',
          '        commando$startRuleIndex   = ' + startRuleIndex + ','
        ].join('\n'));
      } else {
        startRuleFunctions = '{ '
                         + utils.map(
                             options.allowedStartRules,
                             function(r) { return r + ': commando$parse' + r; }
                           ).join(', ')
                         + ' }';
        startRuleFunction = 'commando$parse' + options.allowedStartRules[0];
    
        parts.push([
          '        commando$startRuleFunctions = ' + startRuleFunctions + ',',
          '        commando$startRuleFunction  = ' + startRuleFunction + ','
        ].join('\n'));
      }
    
      parts.push('');
    
      parts.push(indent8(generateTables()));
    
      parts.push([
        '',
        '        commando$currPos          = 0,',
        '        commando$reportedPos      = 0,',
        '        commando$cachedPos        = 0,',
        '        commando$cachedPosDetails = { line: 1, column: 1, seenCR: false },',
        '        commando$maxFailPos       = 0,',
        '        commando$maxFailExpected  = [],',
        '        commando$silentFails      = 0,', // 0 = report failures, > 0 = silence failures
        ''
      ].join('\n'));
    
      if (options.cache) {
        parts.push('        commando$cache = {},');
      }
    
      parts.push([
        '        commando$result;',
        ''
      ].join('\n'));
    
      if (options.optimize === "size") {
        parts.push([
          '    if ("startRule" in options) {',
          '      if (!(options.startRule in commando$startRuleIndices)) {',
          '        throw new Error("Can\'t start parsing from rule \\"" + options.startRule + "\\".");',
          '      }',
          '',
          '      commando$startRuleIndex = commando$startRuleIndices[options.startRule];',
          '    }'
        ].join('\n'));
      } else {
        parts.push([
          '    if ("startRule" in options) {',
          '      if (!(options.startRule in commando$startRuleFunctions)) {',
          '        throw new Error("Can\'t start parsing from rule \\"" + options.startRule + "\\".");',
          '      }',
          '',
          '      commando$startRuleFunction = commando$startRuleFunctions[options.startRule];',
          '    }'
        ].join('\n'));
      }
    
      parts.push([
        '',
        '    function text() {',
        '      return input.substring(commando$reportedPos, commando$currPos);',
        '    }',
        '',
        '    function offset() {',
        '      return commando$reportedPos;',
        '    }',
        '',
        '    function line() {',
        '      return commando$computePosDetails(commando$reportedPos).line;',
        '    }',
        '',
        '    function column() {',
        '      return commando$computePosDetails(commando$reportedPos).column;',
        '    }',
        '',
        '    function expected(description) {',
        '      throw commando$buildException(',
        '        null,',
        '        [{ type: "other", description: description }],',
        '        commando$reportedPos',
        '      );',
        '    }',
        '',
        '    function error(message) {',
        '      throw commando$buildException(message, null, commando$reportedPos);',
        '    }',
        '',
        '    function commando$computePosDetails(pos) {',
        '      function advance(details, startPos, endPos) {',
        '        var p, ch;',
        '',
        '        for (p = startPos; p < endPos; p++) {',
        '          ch = input.charAt(p);',
        '          if (ch === "\\n") {',
        '            if (!details.seenCR) { details.line++; }',
        '            details.column = 1;',
        '            details.seenCR = false;',
        '          } else if (ch === "\\r" || ch === "\\u2028" || ch === "\\u2029") {',
        '            details.line++;',
        '            details.column = 1;',
        '            details.seenCR = true;',
        '          } else {',
        '            details.column++;',
        '            details.seenCR = false;',
        '          }',
        '        }',
        '      }',
        '',
        '      if (commando$cachedPos !== pos) {',
        '        if (commando$cachedPos > pos) {',
        '          commando$cachedPos = 0;',
        '          commando$cachedPosDetails = { line: 1, column: 1, seenCR: false };',
        '        }',
        '        advance(commando$cachedPosDetails, commando$cachedPos, pos);',
        '        commando$cachedPos = pos;',
        '      }',
        '',
        '      return commando$cachedPosDetails;',
        '    }',
        '',
        '    function commando$fail(expected) {',
        '      if (commando$currPos < commando$maxFailPos) { return; }',
        '',
        '      if (commando$currPos > commando$maxFailPos) {',
        '        commando$maxFailPos = commando$currPos;',
        '        commando$maxFailExpected = [];',
        '      }',
        '',
        '      commando$maxFailExpected.push(expected);',
        '    }',
        '',
        '    function commando$buildException(message, expected, pos) {',
        '      function cleanupExpected(expected) {',
        '        var i = 1;',
        '',
        '        expected.sort(function(a, b) {',
        '          if (a.description < b.description) {',
        '            return -1;',
        '          } else if (a.description > b.description) {',
        '            return 1;',
        '          } else {',
        '            return 0;',
        '          }',
        '        });',
        '',
        /*
         * This works because the bytecode generator guarantees that every
         * expectation object exists only once, so it's enough to use |===| instead
         * of deeper structural comparison.
         */
        '        while (i < expected.length) {',
        '          if (expected[i - 1] === expected[i]) {',
        '            expected.splice(i, 1);',
        '          } else {',
        '            i++;',
        '          }',
        '        }',
        '      }',
        '',
        '      function buildMessage(expected, found) {',
        '        function stringEscape(s) {',
        '          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }',
        '',
        /*
         * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a string
         * literal except for the closing quote character, backslash, carriage
         * return, line separator, paragraph separator, and line feed. Any character
         * may appear in the form of an escape sequence.
         *
         * For portability, we also escape all control and non-ASCII characters.
         * Note that "\0" and "\v" escape sequences are not used because JSHint does
         * not like the first and IE the second.
         */
        '          return s',
        '            .replace(/\\\\/g,   \'\\\\\\\\\')', // backslash
        '            .replace(/"/g,    \'\\\\"\')',      // closing double quote
        '            .replace(/\\x08/g, \'\\\\b\')',     // backspace
        '            .replace(/\\t/g,   \'\\\\t\')',     // horizontal tab
        '            .replace(/\\n/g,   \'\\\\n\')',     // line feed
        '            .replace(/\\f/g,   \'\\\\f\')',     // form feed
        '            .replace(/\\r/g,   \'\\\\r\')',     // carriage return
        '            .replace(/[\\x00-\\x07\\x0B\\x0E\\x0F]/g, function(ch) { return \'\\\\x0\' + hex(ch); })',
        '            .replace(/[\\x10-\\x1F\\x80-\\xFF]/g,    function(ch) { return \'\\\\x\'  + hex(ch); })',
        '            .replace(/[\\u0180-\\u0FFF]/g,         function(ch) { return \'\\\\u0\' + hex(ch); })',
        '            .replace(/[\\u1080-\\uFFFF]/g,         function(ch) { return \'\\\\u\'  + hex(ch); });',
        '        }',
        '',
        '        var expectedDescs = new Array(expected.length),',
        '            expectedDesc, foundDesc, i;',
        '',
        '        for (i = 0; i < expected.length; i++) {',
        '          expectedDescs[i] = expected[i].description;',
        '        }',
        '',
        '        expectedDesc = expected.length > 1',
        '          ? expectedDescs.slice(0, -1).join(", ")',
        '              + " or "',
        '              + expectedDescs[expected.length - 1]',
        '          : expectedDescs[0];',
        '',
        '        foundDesc = found ? "\\"" + stringEscape(found) + "\\"" : "end of input";',
        '',
        '        return "Expected " + expectedDesc + " but " + foundDesc + " found.";',
        '      }',
        '',
        '      var posDetails = commando$computePosDetails(pos),',
        '          found      = pos < input.length ? input.charAt(pos) : null;',
        '',
        '      if (expected !== null) {',
        '        cleanupExpected(expected);',
        '      }',
        '',
        '      return new SyntaxError(',
        '        message !== null ? message : buildMessage(expected, found),',
        '        expected,',
        '        found,',
        '        pos,',
        '        posDetails.line,',
        '        posDetails.column',
        '      );',
        '    }',
        ''
      ].join('\n'));
    
      if (options.optimize === "size") {
        parts.push(indent4(generateInterpreter()));
        parts.push('');
      } else {
        utils.each(ast.rules, function(rule) {
          parts.push(indent4(generateRuleFunction(rule)));
          parts.push('');
        });
      }
    
      if (ast.initializer) {
        parts.push(indent4(ast.initializer.code));
        parts.push('');
      }
    
      if (options.optimize === "size") {
        parts.push('    commando$result = commando$parseRule(commando$startRuleIndex);');
      } else {
        parts.push('    commando$result = commando$startRuleFunction();');
      }
    
      parts.push([
        '',
        '    if (commando$result !== commando$FAILED && commando$currPos === input.length) {',
        '      return commando$result;',
        '    } else {',
        '      if (commando$result !== commando$FAILED && commando$currPos < input.length) {',
        '        commando$fail({ type: "end", description: "end of input" });',
        '      }',
        '',
        '      throw commando$buildException(null, commando$maxFailExpected, commando$maxFailPos);',
        '    }',
        '  }',
        '',
        '  return {',
        '    SyntaxError: SyntaxError,',
        '    parse:       parse',
        '  };',
        '})()'
      ].join('\n'));
    
      ast.code = parts.join('\n');
    };
  });

  modules.define("compiler/passes/remove-proxy-rules", function(module, require) {
    var utils = require("../../utils");
    
    /*
     * Removes proxy rules -- that is, rules that only delegate to other rule.
     */
    module.exports = function(ast, options) {
      function isProxyRule(node) {
        return node.type === "rule" && node.expression.type === "rule_ref";
      }
    
      function replaceRuleRefs(ast, from, to) {
        function nop() {}
    
        function replaceInExpression(node, from, to) {
          replace(node.expression, from, to);
        }
    
        function replaceInSubnodes(propertyName) {
          return function(node, from, to) {
            utils.each(node[propertyName], function(subnode) {
              replace(subnode, from, to);
            });
          };
        }
    
        var replace = utils.buildNodeVisitor({
          grammar:      replaceInSubnodes("rules"),
          rule:         replaceInExpression,
          named:        replaceInExpression,
          choice:       replaceInSubnodes("alternatives"),
          sequence:     replaceInSubnodes("elements"),
          labeled:      replaceInExpression,
          text:         replaceInExpression,
          simple_and:   replaceInExpression,
          simple_not:   replaceInExpression,
          semantic_and: nop,
          semantic_not: nop,
          optional:     replaceInExpression,
          zero_or_more: replaceInExpression,
          one_or_more:  replaceInExpression,
          action:       replaceInExpression,
    
          rule_ref:
            function(node, from, to) {
              if (node.name === from) {
                node.name = to;
              }
            },
    
          literal:      nop,
          "class":      nop,
          any:          nop
        });
    
        replace(ast, from, to);
      }
    
      var indices = [];
    
      utils.each(ast.rules, function(rule, i) {
        if (isProxyRule(rule)) {
          replaceRuleRefs(ast, rule.name, rule.expression.name);
          if (!utils.contains(options.allowedStartRules, rule.name)) {
            indices.push(i);
          }
        }
      });
    
      indices.reverse();
    
      utils.each(indices, function(index) {
        ast.rules.splice(index, 1);
      });
    };
  });

  modules.define("compiler/passes/report-left-recursion", function(module, require) {
    var utils        = require("../../utils"),
        GrammarError = require("../../grammar-error");
    
    /* Checks that no left recursion is present. */
    module.exports = function(ast) {
      function nop() {}
    
      function checkExpression(node, appliedRules) {
        check(node.expression, appliedRules);
      }
    
      function checkSubnodes(propertyName) {
        return function(node, appliedRules) {
          utils.each(node[propertyName], function(subnode) {
            check(subnode, appliedRules);
          });
        };
      }
    
      var check = utils.buildNodeVisitor({
        grammar:     checkSubnodes("rules"),
    
        rule:
          function(node, appliedRules) {
            check(node.expression, appliedRules.concat(node.name));
          },
    
        named:       checkExpression,
        choice:      checkSubnodes("alternatives"),
        action:      checkExpression,
    
        sequence:
          function(node, appliedRules) {
            if (node.elements.length > 0) {
              check(node.elements[0], appliedRules);
            }
          },
    
        labeled:      checkExpression,
        text:         checkExpression,
        simple_and:   checkExpression,
        simple_not:   checkExpression,
        semantic_and: nop,
        semantic_not: nop,
        optional:     checkExpression,
        zero_or_more: checkExpression,
        one_or_more:  checkExpression,
    
        rule_ref:
          function(node, appliedRules) {
            if (utils.contains(appliedRules, node.name)) {
              throw new GrammarError(
                "Left recursion detected for rule \"" + node.name + "\"."
              );
            }
            check(utils.findRuleByName(ast, node.name), appliedRules);
          },
    
        literal:      nop,
        "class":      nop,
        any:          nop
      });
    
      check(ast, []);
    };
  });

  modules.define("compiler/passes/report-missing-rules", function(module, require) {
    var utils        = require("../../utils"),
        GrammarError = require("../../grammar-error");
    
    /* Checks that all referenced rules exist. */
    module.exports = function(ast) {
      function nop() {}
    
      function checkExpression(node) { check(node.expression); }
    
      function checkSubnodes(propertyName) {
        return function(node) { utils.each(node[propertyName], check); };
      }
    
      var check = utils.buildNodeVisitor({
        grammar:      checkSubnodes("rules"),
        rule:         checkExpression,
        named:        checkExpression,
        choice:       checkSubnodes("alternatives"),
        action:       checkExpression,
        sequence:     checkSubnodes("elements"),
        labeled:      checkExpression,
        text:         checkExpression,
        simple_and:   checkExpression,
        simple_not:   checkExpression,
        semantic_and: nop,
        semantic_not: nop,
        optional:     checkExpression,
        zero_or_more: checkExpression,
        one_or_more:  checkExpression,
    
        rule_ref:
          function(node) {
            if (!utils.findRuleByName(ast, node.name)) {
              throw new GrammarError(
                "Referenced rule \"" + node.name + "\" does not exist."
              );
            }
          },
    
        literal:      nop,
        "class":      nop,
        any:          nop
      });
    
      check(ast);
    };
  });

  modules.define("compiler", function(module, require) {
    var utils = require("./utils");
    
    module.exports = {
      /*
       * Compiler passes.
       *
       * Each pass is a function that is passed the AST. It can perform checks on it
       * or modify it as needed. If the pass encounters a semantic error, it throws
       * |COMMANDO.GrammarError|.
       */
      passes: {
        check: {
          reportMissingRules:  require("./compiler/passes/report-missing-rules"),
          reportLeftRecursion: require("./compiler/passes/report-left-recursion")
        },
        transform: {
          removeProxyRules:    require("./compiler/passes/remove-proxy-rules")
        },
        generate: {
          generateBytecode:    require("./compiler/passes/generate-bytecode"),
          generateJavascript:  require("./compiler/passes/generate-javascript")
        }
      },
    
      /*
       * Generates a parser from a specified grammar AST. Throws |COMMANDO.GrammarError|
       * if the AST contains a semantic error. Note that not all errors are detected
       * during the generation and some may protrude to the generated parser and
       * cause its malfunction.
       */
      compile: function(ast, passes) {
        var options = arguments.length > 2 ? utils.clone(arguments[2]) : {},
            stage;
    
        /*
         * Extracted into a function just to silence JSHint complaining about
         * creating functions in a loop.
         */
        function runPass(pass) {
          pass(ast, options);
        }
    
        utils.defaults(options, {
          allowedStartRules:  [ast.rules[0].name],
          cache:              false,
          optimize:           "speed",
          output:             "parser"
        });
    
        for (stage in passes) {
          if (passes.hasOwnProperty(stage)) {
            utils.each(passes[stage], runPass);
          }
        }
    
        switch (options.output) {
          case "parser": return eval(ast.code);
          case "source": return ast.code;
        }
      }
    };
  });

  modules.define("commando", function(module, require) {
    var utils = require("./utils");
    
    module.exports = {
      VERSION: "0.8.0",
    
      GrammarError: require("./grammar-error"),
      parser:       require("./parser"),
      compiler:     require("./compiler"),
    
      /*
       * Generates a parser from a specified grammar and returns it.
       *
       * The grammar must be a string in the format described by the metagramar in
       * the parser.commandojs file.
       *
       * Throws |COMMANDO.parser.SyntaxError| if the grammar contains a syntax error or
       * |COMMANDO.GrammarError| if it contains a semantic error. Note that not all
       * errors are detected during the generation and some may protrude to the
       * generated parser and cause its malfunction.
       */
      buildParser: function(grammar) {
        function convertPasses(passes) {
          var converted = {}, stage;
    
          for (stage in passes) {
            if (passes.hasOwnProperty(stage)) {
              converted[stage] = utils.values(passes[stage]);
            }
          }
    
          return converted;
        }
    
        var options = arguments.length > 1 ? utils.clone(arguments[1]) : {},
            plugins = "plugins" in options ? options.plugins : [],
            config  = {
              parser: this.parser,
              passes: convertPasses(this.compiler.passes)
            };
    
        utils.each(plugins, function(p) { p.use(config, options); });
    
        return this.compiler.compile(
          config.parser.parse(grammar),
          config.passes,
          options
        );
      }
    };
  });

  return modules["commando"]
})();
