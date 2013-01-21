/**
 * Gabby
 *
 * A beautifully simple static site generator.
 *
 * @author Alex Mingoia <talk@alexmingoia.com>
 * @url https://github.com/alexmng/gabby
 */


/**
 * Dependencies
 */

var Alog      = require('alog'),
    findit    = require('findit'),
    fspath    = require('path'),
    fs        = require('fs'),
    uglifyjs  = require('uglify-js'),
    uglifycss = require('uglifycss');


/**
 * Awesome logger
 */

var log = new Alog();
// Send uncaught exceptions to our awesome logger.
process.on('uncaughtException', function(err) {
  log.error(err);
});


/**
 * Expose `Gabby`
 */

module.exports = Gabby;


/**
 * Create a new Gabby project from given `path`.
 *
 * @param String path Project path.
 * @return Gabby Returns Gabby instance.
 * @api public
 */

function Gabby(path) {
  Object.defineProperty(this, 'path', {value: fspath.resolve(path)});
  return this;
};


/**
 * Gabby prototype
 */

var gabby = Gabby.prototype;


/**
 * Create project skeleton.
 *
 * @api public
 */

gabby.createProjectSkeleton = function() {
  log.started('Generating new project in ' + this.path);
  var skeleton = [
    'generated',
    'pages',
    'pages/index.md',
    'public',
    'public/images',
    'public/images/favicon.png',
    'public/images/gabby.png',
    'public/images/background.png',
    'public/images/background@2x.png',
    'scripts',
    'styles',
    'styles/screen.styl',
    'templates',
    'templates/layout.html'
  ];
  var src = {
    'pages/index.md': fs.readFileSync(
      __dirname + '/../README.md', 'utf8'
    ),
    'public/images/favicon.png': fs.readFileSync(
      __dirname + '/../src/public/images/favicon.png'
    ),
    'public/images/gabby.png': fs.readFileSync(
      __dirname + '/../src/public/images/gabby.png'
    ),
    'templates/layout.html': fs.readFileSync(
      __dirname + '/../src/templates/layout.html', 'utf8'
    ),
    'public/images/background.png': fs.readFileSync(
      __dirname + '/../src/public/images/background.png'
    ),
    'public/images/background@2x.png': fs.readFileSync(
      __dirname + '/../src/public/images/background@2x.png'
    ),
    'styles/screen.styl': fs.readFileSync(
      __dirname + '/../src/styles/screen.styl', 'utf8'
    )
  };
  try {
    fs.mkdirSync(this.path, 0755);
    log.created(this.path);
  }
  catch(err) {
    log.notice('Could not create: ' + this.path);
  }
  for (var i=0; i<skeleton.length; i++) {
    if (skeleton[i].indexOf('.') === -1) {
      try {
        fs.mkdirSync(this.path + '/' + skeleton[i], 0755);
      }
      catch(err) {
        log.notice('Could not create: ' + this.path + '/' + skeleton[i]);
      }
    }
    else {
      try {
        fs.writeFileSync(
          this.path + '/' + skeleton[i], src[skeleton[i]]);
      }
      catch(err) {
        log.notice('Could not create: ' + this.path + '/' + skeleton[i]);
      }
    }
    log.created(this.path + '/' + skeleton[i]);
  }
  log.finished('Your project is ready :)');
};


/**
 * Build static files and update `generated` folder.
 *
 * @api public
 */

gabby.build = function() {
  this.generateHTML(this.path);
  this.generateCSS(this.path);
  this.generateJS(this.path);
};


/**
 * Generate HTML
 *
 * @api private
 */

gabby.generateHTML = function() {
  var self = this;
  var layout = __dirname + '/../src/templates/layout.html';
  var templates = findit.sync(self.path + '/templates');
  for (var i=0; i<templates.length; i++) {
    if (templates[i].indexOf('layout.') !== -1
    && templates[i].indexOf('layout.json') === -1) {
      layout = templates[i];
    }
  }
  var finder = findit.find(this.path + '/pages');
  var next = function(err, file, html) {
    if (err) throw err;
    self.preprocess(
      layout,
      {content: html, pageTitle: 'Gabby'},
      function(err, tplFile, output) {
        if (err) throw err;
        fs.writeFileSync(
          file
            .replace(/\/pages\//, '/generated/')
            .replace(/\.[^\.]+$/, '.html'),
          output, 'utf8'
        );
        finder._fileCount--;
        if (finder._fileCount === 0) {
          log.finished('Generating HTML pages');
        }
      }
    );
  };
  finder.on('file', function(file, stat) {
    finder._fileCount = (finder._fileCount || 0) + 1;
    if (finder._fileCount === 1) {
      log.started('Generating HTML pages');
    }
    self.preprocess(file, {}, next);
  });
};


/**
 * Package and minify CSS
 *
 * @api private
 */

gabby.generateCSS = function() {
  var self = this;
  if (!fs.existsSync(this.path + '/generated/css')) {
    fs.mkdirSync(this.path + '/generated/css', 0755);
  }
  var finder = findit.find(this.path + '/styles');
  var cssCollection = [];
  var next = function(err, file, css) {
    if (err) throw err;
    cssCollection.push(css);
    finder._fileCount--;
    if (finder._fileCount === 0) {
      fs.writeFileSync(
        self.path + '/generated/css/screen.css',
        uglifycss.processString(cssCollection.join(';')),
        'utf8'
      );
      log.finished('Packaging and minifying CSS');
    }
  };
  finder.on('file', function(file, stat) {
    var ext = file.split('.').pop();
    if (ext.match(/(css|sass|scss|styl|less)/)) {
      finder._fileCount = (finder._fileCount || 0) + 1;
      if (finder._fileCount === 1) {
        log.started('Packaging and minifying CSS');
      }
      self.preprocess(file, {}, next);
    }
  });
};


/**
 * Package and minify JavaScript
 *
 * @api private
 */

gabby.generateJS = function() {
  var self = this;
  if (!fs.existsSync(this.path + '/generated/js')) {
    fs.mkdirSync(this.path + '/generated/js', 0755);
  }
  var finder = findit.find(this.path + '/scripts');
  var jsCollection = [];
  var next = function(err, file, js) {
    if (err) throw err;
    jsCollection.push(js);
    finder._fileCount--;
    if (finder._fileCount === 0) {
      fs.writeFileSync(
        self.path + '/generated/js/common.js',
        uglifyjs.minify(jsCollection.join(';'), {fromString: true}),
        'utf8'
      );
      log.finished('Packaging and minifying JavaScript');
    }
  };
  finder.on('file', function(file, stat) {
    var ext = file.split('.').pop();
    if (ext.match(/(js|coffee)/)) {
      finder._fileCount = (finder._fileCount || 0) + 1;
      if (finder._fileCount === 1) {
        log.started('Packaging and minifying JavaScript');
      }
      self.preprocess(file, {}, next);
    }
  });
};


/**
 * Preprocess given `file` and execute callback with final output.
 *
 * @param String file
 * @param Mixed data Optional.
 * @param Function(err, file, output) callback
 * @api private
 */

var preprocess = gabby.preprocess = function(file, data, callback) {
  for (var ext in this.preprocess) {
    if (this.preprocess.hasOwnProperty(ext)
    && file.substr(-(ext.length)) === ext) {
      this.preprocess[ext](file, (data || {}), callback);
    }
  }
};


/**
 * Preprocess CSS
 *
 * @param String file
 * @param Mixed data
 * @param Function(err, file, css) callback
 * @api private
 */

preprocess.css = function(file, data, callback) {
  try {
    var css = fs.readFileSync(file, 'utf8');
    callback(null, file, css);
  }
  catch (err) {
    callback(err, file);
  }
};


/**
 * Preprocess CoffeeScript
 *
 * @param String file
 * @param Mixed data
 * @param Function(err, file, js) callback
 * @api private
 */

preprocess.coffee = function(file, data, callback) {
  try {
    var js = require('coffee-script').compile(fs.readFileSync(file, 'utf8'));
    callback(null, file, js);
  }
  catch (err) {
    callback(err, file);
  }
};


/**
 * Preprocess Haml
 *
 * @param String file
 * @param Mixed data
 * @param Function(err, file, html) callback
 * @api private
 */

preprocess.haml = function(file, data, callback) {
  try {
    var html = require('haml-js').render(fs.readFileSync(file, 'utf8'), {locals: data});
    callback(null, file, html);
  }
  catch (err) {
    callback(err, file);
  }
};


/**
 * Preprocess HTML/Plates
 *
 * @param String file
 * @param Mixed data
 * @param Function(err, file, html) callback
 * @api private
 */

preprocess.html = function(file, data, callback) {
  try {
    var tpl = fs.readFileSync(file, 'utf8');
    var html = require('plates').bind(tpl, data);
    callback(null, file, html);
  }
  catch (err) {
    callback(err, file);
  }
};


/**
 * Preprocess Jade
 *
 * @param String file
 * @param Mixed data
 * @param Function(err, html) callback
 * @api private
 */

preprocess.jade = function(file, data, callback) {
  try {
    var html = require('jade').render(fs.readFileSync(file, 'utf8'), {locals: data});
    callback(null, file, html);
  }
  catch (err) {
    callback(err, file);
  }
};


/**
 * Preprocess JavaScript
 *
 * @param String file
 * @param Mixed data
 * @param Function(err, file, js) callback
 * @api private
 */

preprocess.js = function(file, data, callback) {
  try {
    var js = fs.readFileSync(file, 'utf8');
    callback(null, file, js);
  }
  catch (err) {
    callback(err, file);
  }
};


/**
 * Preprocess Markdown
 *
 * @param String file
 * @param Mixed data
 * @param Function(err, file, html) callback
 * @api private
 */

preprocess.markdown = preprocess.md = function(file, data, callback) {
  try {
    var html = require('marked')(fs.readFileSync(file, 'utf8'));
    callback(null, file, html);
  }
  catch (err) {
    callback(err, file);
  }
};


/**
 * Preprocess Stylus
 *
 * @param String file
 * @param Mixed data
 * @param Function(err, file, css) callback
 * @api private
 */

preprocess.styl = function(file, data, callback) {
  require('stylus').render(fs.readFileSync(file, 'utf8'), function(err, css) {
    (err) ? callback(err, file) : callback(null, file, css);
  });
};
