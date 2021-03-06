/**
 * The main API for the logging framework.
 *
 * @file    index.js
 *
 *
 * @see Must declare it a class so it will be properly parsed.
 * @see https://github.com/yui/yuidoc/issues/25
 *
 * @class   node-android-logging
 * @module  node-android-logging
 *
 * @author  Henry Brown
 */
"use strict";

var circularJSON  = require("circular-json");
var printf        = require("util").format;
var _s            = require("underscore.string");

function getSelf() {
  return module.exports;
}

module.exports.getSelf = getSelf;

/**
 * Enable stdout output (enabled by default)
 *
 * @method                    enableStdout
 * @param {String} level      The log level to set for stdout output
 *
 * @returns {void}
 */
module.exports.enableStdout = function(level) {
  getSelf()._enableStdout = true;
  getSelf()._stdoutLevel  = getSelf()._getIntLevel(level);
};

/**
 * Disable stdout
 *
 * @method                    disableStdout
 *
 * @returns {void}
 */
module.exports.disableStdout = function() {
  getSelf()._enableStdout = false;
  if (getSelf().stdOutLevel === undefined) {
    getSelf()._stdoutLevel = getSelf()._getIntLevel("Debug");
  }
};

/**
 * Enable stderr output (disabled by default)
 *
 * @method                    enableStderr
 * @param {String} level      The log level to set for stderr output
 *
 * @returns {void}
 */
module.exports.enableStderr = function(level) {
  getSelf()._enableStderr = true;
  getSelf()._stderrLevel  = getSelf()._getIntLevel(level);
};

/**
 * Disable stderr output
 *
 * @method                    disableStderr
 *
 * @returns {void}
 *
 * @see                       disableStdout
 * @see                       enableStderr
 */
module.exports.disableStderr = function() {
  getSelf()._enableStderr = false;
  if (getSelf().stdErrLevel === undefined) {
    getSelf()._stderrLevel = getSelf()._getIntLevel("Debug");
  }
};

module.exports.enableQueue = function(level) {
  getSelf()._enableQueue = true;
  getSelf()._queueLevel  = getSelf()._getIntLevel(level);
};

module.exports.disableQueue = function() {
  getSelf()._enableQueue = false;
  if (getSelf().queueLevel === undefined) {
    getSelf()._queueLevel = getSelf()._getIntLevel("Debug");
  }
};

module.exports.emptyQueue = function() {
  if (this._queue !== undefined) {
    this._queue.length = 0;
  }
};

module.exports.setPadding = function(fileFuncPadLength, linePadLength) {
  getSelf()._fileFuncPad = fileFuncPadLength;
  getSelf()._linePad = linePadLength;
};

module.exports.F = function() {
  getSelf()._log("Fatal", arguments);
};

module.exports.E = function() {
  getSelf()._log("Error", arguments);
};

module.exports.W = function() {
  getSelf()._log("Warn", arguments);
};

module.exports.I = function() {
  getSelf()._log("Info", arguments);
};

module.exports.D = function() {
  getSelf()._log("Debug", arguments);
};

module.exports.T = function() {
  getSelf()._log("Trace", arguments);
};

module.exports.checkDefaults = function() {
  var s = getSelf();

  if (s._enableStdout === undefined &&
      s._enableStderr === undefined &&
      s._enableQueue  === undefined) {
    s.setDefaults();

    return;
  }

  // If any one of the values has been set, we'll just disable all the defaults.
  if (s._enableStdout === undefined) {
    s.disableStdout();
  } else {
    if (s._stdoutLevel === undefined) {
      s.enableStdout("Debug");
    }
  }

  if (s._enableStderr === undefined) {
    s.disableStderr();
  } else {
    if (s._stderrLevel === undefined) {
      s.enableStderr("Debug");
    }
  }

  if (s._enableQueue === undefined) {
    s.disableQueue();
  } else {
    if (s._queueLevel === undefined) {
      s.enableQueue("Debug");
    }
  }
};

module.exports.setDefaults = function() {
  getSelf().enableStderr("Debug");
  getSelf().disableStdout();
  getSelf().disableQueue();

  getSelf().setPadding(30, 5);
};

module.exports.peek = function() {
  var s = getSelf();

  if (s._queue === undefined || s._queue.length === 0) {
    return "";
  }

  return s._queue[0];
};

module.exports.pop = function() {
  var s = getSelf();

  if (s._queue === undefined || s._queue.length === 0) {
    return "";
  }

  return s._queue.shift();
};

module.exports._log = function(logLevel, args) {
  var s = getSelf();

  s.checkDefaults();

  args          = [].slice.apply(args).map(getSelf()._convertToString);

  let fileLineFunc  = s._getFileLineFunc();

  let prefix        = printf("%s/%s(%s):", logLevel[0], fileLineFunc["fileFunc"], fileLineFunc["line"]);

  s._doLog(logLevel, printf("%s %s", prefix, args.join(",")));
};

module.exports._doLog = function(logLevel, message) {
  var s = getSelf();

  if (s._enableQueue === true) {
    if (s._queue === undefined) {
      s._queue = [];
    }

    if (s._getIntLevel(logLevel) <= s._queueLevel) {
      s._queue.push(message);
    }
  }

  if (s._enableStdout === true) {
    if (s._getIntLevel(logLevel) <= s._stdoutLevel) {
      //eslint-disable-next-line no-console
      console.log(message);
    }
  }

  if (s._enableStderr === true) {
    if (s._getIntLevel(logLevel) <= s._stderrLevel) {
      //eslint-disable-next-line no-console
      console.error(message);
    }
  }
};

module.exports._getFileLineFunc = function() {
  var s = getSelf();

  try {
    var stack = s._getStackTrace();
    var firstFile = stack[0].file;
    let stackIter;

    for (stackIter = 1; stackIter < stack.length; ++stackIter) {
      if (firstFile !== stack[stackIter].file) {
        return {
          fileFunc: _s.rpad(stack[stackIter].file + " " + stack[stackIter].func, s._fileFuncPad),
          line: _s.lpad(stack[stackIter].line, s._linePad)
        };
      }
    }

    return stack[stackIter];
  } catch (ex) {
    //eslint-disable-next-line no-console
    console.log(ex);

    throw ex;
  }
};

module.exports._getStackTrace = function() {
  var trace = (new Error).stack.split("\n");
  var stack = [];

  let traceIter;

  for (traceIter = 1; traceIter < trace.length; ++traceIter) {
    let line = trace[traceIter];

    let words = line.trim().split(" ");
    let splt  = words[1].split(".");

    stack.push({
      file: words[words.length - 1].replace(/^.*\//, "").replace(/:.*$/, "").replace(/\(/, ""),
      func: splt[splt.length - 1],
      line: words[words.length - 1].replace(/^[^:]*:/, "").replace(/:[^:]*/, "")
    });
  }

  return stack;
};

module.exports._stringify = function(arg) {
  return circularJSON.stringify(arg, null, 2).replace(/\\n/g, "\n");
};

/**
 * Indents the passed string by a number of spaces characters equal to the
 *  indentSize parameter.
 *
 * @param {String} str        The string to indent
 * @param {Number} indentSize The number of spaces to indent each line
 *
 * @returns {String}          The indented string
 *
 * @example
 * //outputs:
 * //    {
 * //      "name": "Fred",
 * //      "role": "Superhero",
 * //      "mascot": "Platypus"
 * //    }
 * console.log(JSON.stringify({
 *   "name": "Fred",
 *   "role": "Superhero",
 *   "mascot": "Platypus"
 * }, null, 2).indent(4));
 */
function indent(str, indentSize) {
  let sliceLength = 2;

  if (str.startsWith("\n")) {
    /* We have to slice a little extra if the first character in this string is
        a newline character. */
    sliceLength += indentSize;
  }

  /* prepend a new line in order to indent the first line as well */
  return ("\n " + str)
  /* replace all consecutive end of line characters with \n and indentSize
      spaces */
    .replace(/[\r\n]+/g, "\n" + " ".repeat(indentSize))
  /* pulls off the first newline (which we prepended in order to indent the
      first line.) */
    .slice(sliceLength);
}

module.exports._convertToString = function(arg) {
  var INDENT_SIZE = 4;

  if (arg === undefined) {
    return "";
  } else if (typeof arg === "boolean") {
    return "" + arg;
  } else if (typeof arg === "string") {
    return arg;
  } else if (typeof arg === "number") {
    return "" + arg;
  } else if (Array.isArray(arg)) {
    return indent(("\n" + getSelf()._stringify(arg, null, 2)), INDENT_SIZE);
  } else if (arg != null && typeof arg === "object") {
    var c = Object.prototype.toString.call(arg);

    if (c == "[object Error]") {
      // For some reason, the stacktrace is not visible, so this hack fixes that
      arg = {
        "error": arg.stack.split("\n")[0],
        "stack": arg.stack.split("\n").slice(1)
          .map(function(each) { return each.trim(); })
      };
    }

    return indent(("\n" + getSelf()._stringify(arg, null, 2)), INDENT_SIZE);
  } else {
    let message = indent("\nUnsupported type: " + getSelf()._stringify({
      arg: arg,
      type: typeof arg,
      toString: Object.prototype.toString.call(arg)
    }, null, 2), INDENT_SIZE);

    let err = new TypeError(message);

    throw err;
  }
};

module.exports._levels = [ "Fatal", "Error", "Warn", "Info", "Debug", "Trace" ];

module.exports._getIntLevel = function(level) {
  var s = getSelf();
  var levelIter;

  for (levelIter = 0; levelIter < s._levels.length; ++levelIter) {
    if (s._levels[levelIter] === level) {
      return levelIter;
    }
  }

  throw new Error("Invalid log level supplied: " + level);
};

