var circularJSON  = require('circular-json');
var printf        = require('util').format;

function getSelf() {
  return module.exports;
};

module.exports.getSelf = getSelf;

module.exports.enableStdout = function(level) {
  getSelf()._enableStdout = true;
  getSelf()._stdoutLevel  = getSelf()._getIntLevel(level);
};

module.exports.disableStdout = function() {
  getSelf()._enableStdout = false;
  if (getSelf().stdOutLevel === undefined) {
    getSelf()._stdoutLevel = getSelf()._getIntLevel("Debug");
  }
};

module.exports.enableStderr = function(level) {
  getSelf()._enableStderr = true;
  getSelf()._stderrLevel  = getSelf()._getIntLevel(level);
};

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

  var args      = [].slice.apply(args).map(getSelf()._convertToString);

  fileLineFunc  = s._getFileLineFunc();

  prefix        = printf("%s/%s(%s):", logLevel[0],
      fileLineFunc['fileFunc'], fileLineFunc['line']);

  s._doLog(logLevel, printf("%s %s", prefix, args.join(',')));
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
      console.log(message);
    }
  }

  if (s._enableStderr === true) {
    if (s._getIntLevel(logLevel) <= s._stderrLevel) {
      console.error(message);
    }
  }
};

module.exports._getFileLineFunc = function() {
  var s = getSelf();

  try {
    var stack = s._getStackTrace();
    var firstFile = stack[0].file;

    for (stackIter = 1; stackIter < stack.length; ++stackIter) {
      if (firstFile !== stack[stackIter].file) {
        return {
          fileFunc: (stack[stackIter].file + " " + stack[stackIter].func).padRight(' ', s._fileFuncPad),
          line: stack[stackIter].line.padLeft (' ', s._linePad)
        };
      }
    }

    return stack[stackIter];
  } catch (ex) {
    console.log(ex);

    throw ex;
  }
};

module.exports._getStackTrace = function() {
  var trace = (new Error).stack.split('\n');
  var stack = [];

  var traceIter;

  for (traceIter = 1; traceIter < trace.length; ++traceIter) {
    line = trace[traceIter];

    words = line.trim().split(' ');
    splt  = words[1].split('.');

    stack.push({
      file: words[words.length - 1].replace(/^.*\//, '').replace(/:.*$/, '').replace(/\(/, ''),
      func: splt[splt.length - 1],
      line: words[words.length - 1].replace(/^[^:]*:/, '').replace(/:[^:]*/, '')
    });
  }

  return stack;
};

module.exports._convertToString = function(arg) {
  if (typeof arg === "string") {
    return arg;
  } else if (Array.isArray(arg)) {
    return circularJSON(arg);
  } else if (arg != null && typeof arg === "object") {
    var c = Object.prototype.toString.call(arg);

    if (c == "[object Error]") {
      // For some reason, the stacktrace is not visible, so this hack fixes that
      arg = {"error": arg, "stack": arg.stack};
    }

    return circularJSON.stringify(arg);
  } else {
    err = new TypeError("Unsupported type: " + circularJSON({
      arg: arg,
      type: typeof arg,
      toString: Object.prototype.toString.call(arg)
    }));

    throw err;
  }
};

module.exports._levels = [ 'Fatal', 'Error', 'Warn', 'Info', 'Debug', 'Trace' ];

module.exports._getIntLevel = function(level) {
  var s = getSelf();
  var levelIter;

  for (levelIter = 0; levelIter < s._levels.length; ++levelIter) {
    if (s._levels[levelIter] === level) {
      return levelIter;
    }
  }

  return -1;
};

String.prototype.padLeft = function(padValue, padLength) {
  return String(padValue.repeat(padLength) + this)
    .slice(-padLength * padValue.length);
};

String.prototype.padRight = function(padValue, padLength) {
  return String(this + padValue.repeat(padLength))
    .slice(0, padLength * padValue.length);
};

