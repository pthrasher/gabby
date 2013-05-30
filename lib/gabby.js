/* vim:set softtabstop=2 shiftwidth=2 tabstop=2 expandtab: */
/* -*- Mode: tab-width: 2; c-basic-offset: 2; indent-tabs-mode: nil -*- */

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
    async     = require('async'),
    findit    = require('findit'),
    fspath    = require('path'),
    fs        = require('fs'),
    rat       = require('rat'),
    mkdirp    = require('mkdirp'),
    uglifyjs  = require('uglify-js'),
    uglifycss = require('uglifycss');


/**
 * Expose `Gabby`
 */

module.exports = Gabby;


/**
 * Create a new Gabby project from given `path`.
 *
 * @param String path Project path.
 * @param Map options
 * @return Gabby Returns Gabby instance.
 * @api public
 */

function Gabby(path, options) {
  var self = this;
  path = fspath.resolve(path);
  options = options || {};
  options.layout = options.layout || path + '/templates/layout.html';
  Object.defineProperty(this, 'log', {
    value: new Alog({
      level: options['log level']
    })
  });
  Object.defineProperty(this, 'options', {value: options});
  Object.defineProperty(this, 'path', {value: path});
  // Send uncaught exceptions to our awesome logger.
  process.on('uncaughtException', function(err) {
    self.log.error(err);
  });
  return this;
}


/**
 * Gabby prototype
 */

var gabby = Gabby.prototype;


/**
 * Build static files and update `generated` folder.
 *
 * @api public
 */

gabby.build = function() {
  var self = this;
  var build = function() {
    self.log.started('Building static files');
    rat.copy(self.path+'/public', self.path+'/generated', function(errors) {
      if (errors) throw errors.shift();
      self.generateHTML(function() {
        self.generateCSS(function() {
          self.generateJS(function() {
            self.log.finished('Your site is ready :)');
          });
        });
      });
    });
  };
  fs.exists(self.path + '/generated', function(exists) {
    if (exists) {
      rat.remove(self.path + '/generated', function(err) {
        if (err) throw err;
        fs.mkdir(self.path + '/generated', function(err) {
          if (err) throw err;
          build();
        });
      });
    }
    else {
      fs.mkdir(self.path + '/generated', function(err) {
        if (err) throw err;
        build();
      });
    }
  });
};


/**
 * Generate HTML from content files and templates.
 *
 * @param Function callback
 * @api private
 */

gabby.generateHTML = function(callback) {
  var self = this;
  this.log.debug('Generating HTML pages');
  // Find supported content files.
  var filesProcessed = 0;
  var files = [];
  var finder = findit.find(this.path + '/content');
  finder.on('file', function(file) {
    var ext = file.split('.').pop().toLowerCase();
    if (self.compile[ext]) {
      files.push(file);
    }
  });
  finder.on('end', function() {
    // Compile each content file into HTML page and save it to the generated
    // folder.
    files.forEach(function(file) {
      self.compile(file, function(data) {
        self.createHTMLPageFromData(data, function() {
          filesProcessed++;
          if (files.length === filesProcessed) {
            callback && callback();
          }
        });
      });
    });
  });
};


/**
 * Generate CSS
 *
 * @param Function callback
 * @api public
 */

gabby.generateCSS = function(callback) {
  var self = this;
  this.log.debug('Concatenating and minifying CSS');
  // Find supported styles
  fs.exists(self.path + '/styles', function(exists) {
    if (!exists) {
      callback && callback();
      return;
    }
    var files = [];
    var finder = findit.find(self.path + '/styles');
    finder.on('file', function(file) {
      var ext = file.split('.').pop().toLowerCase();
      if (self.transcompile[ext]) {
        files.push(file);
      }
    });
    finder.on('end', function() {
      if (files.length === 0) {
        callback && callback();
        return;
      }
      // Transcompile styles to CSS, then concatenate and minify
      var cssCollection = [];
      files.forEach(function(file) {
        self.transcompile(file, function(css) {
          cssCollection.push(css);
          if (files.length === cssCollection.length) {
            css = cssCollection.join('\n');
            if (!self.options.debug) {
              css = uglifycss.processString(css);
            }
            fs.writeFile(
              self.path + '/generated/screen.css', css, 'utf8',
              function(err) {
                if (err) throw err;
                callback && callback();
              }
            );
          }
        });
      });
    });
  });
};


/**
 * Generate JavaScript
 *
 * @param Function callback
 * @api public
 */

gabby.generateJS = function(callback) {
  var self = this;
  self.log.debug('Concatenating and minifying JavaScript');
  // Find supported scripts
  fs.exists(self.path + '/scripts', function(exists) {
    if (!exists) {
      callback && callback();
      return;
    }
    var files = [];
    var finder = findit.find(self.path + '/scripts');
    finder.on('file', function(file) {
      var ext = file.split('.').pop().toLowerCase();
      if (self.transcompile[ext]) {
        files.push(file);
      }
    });
    finder.on('end', function() {
      if (files.length === 0) {
        callback && callback();
        return;
      }
      // Transcompile scripts to JS, then concatenate and minify
      var jsCollection = [];
      files.forEach(function(file) {
        self.transcompile(file, function(js) {
          jsCollection.push(js);
          if (jsCollection.length === files.length) {
            var result = {code: jsCollection.join(';')};
            if (!self.options.debug) {
              result.code = uglifyjs.minify(result.code);
            }
            fs.writeFile(
              self.path + '/generated/common.js', result.code, 'utf8',
              function(err) {
                if (err) throw err;
                callback && callback();
              }
            );
          }
        });
      });
    });
  });
};


/**
 * Create HTML page from `data` and save it to the generated folder.
 *
 * @param Map data
 * @param Function callback
 * @api private
 */

gabby.createHTMLPageFromData = function(data, callback) {
  var self = this;
  if (data.template) {
    // If there's a template specified for this page, render the HTML content
    // and store it in ```data.content```, then render using the layout.
    data.template = this.path + '/templates/' + data.template;
    this.render(data.template, data, function(html) {
      data.content = html;
      self.render(self.options.layout, data, function(html) {
        var fp = fspath.join(self.path, 'generated',
                            data.url + '.html');
        fs.exists(fspath.dirname(fp), function(exists){
          mkdirp.sync(fspath.dirname(fp));
          fs.writeFile(
            fp,
            html,
            'utf8',
            function(err) {
              if (err) throw err;
              self.log.debug(
                'Created ' + fp
              );
              callback.call(self);
            }
          );
        });
      });
    });
  }
  else {
    this.render(self.options.layout, data, function(html) {
      fs.writeFile(
        self.path + '/generated' + data.url + '.html',
        html,
        'utf8',
        function(err) {
          if (err) throw err;
          self.log.debug('Created ' + '/generated' + data.url + '.html');
          callback.call(self);
        }
      );
    });
  }
};


/**
 * Compile data from content `file`.
 *
 * @param String file
 * @param Function(data) callback
 * @api private
 */

gabby.compile = function(file, callback) {
  var fileExt = file.split('.').pop().toLowerCase();
  for (var ext in this.compile) {
    if (this.compile.hasOwnProperty(ext) && ext === fileExt) {
      return this.compile[ext].call(this, file, callback);
    }
  }
  this.log.notice('File extension not supported for file: ' + file);
};


/**
 * Compile data from .json `file`
 *
 * @param String file
 * @param Function(data) callback
 * @api private
 */

gabby.compile.json = function(file, callback) {
  var self = this;
  fs.readFile(file, 'utf8', function(err, json) {
    if (err) throw err;
    var data = JSON.parse(json);
    data.title = data.title || file.split('/').pop().replace(/\.[^\.]+$/, '');
    data.url = file.replace(/^.+content/, '').replace(/\.[^\.]+$/, '');
    callback.call(self, data);
  });
};


/**
 * Compile data from .markdown or .md `file`
 *
 * @param String file
 * @param Function(data) callback
 * @api private
 */

gabby.compile.markdown = gabby.compile.md = function(file, callback) {
  var self = this;
  fs.readFile(file, 'utf8', function(err, markdown) {
    if (err) throw err;
    // Grab page data from markdown
    var data = {};
    markdown = markdown.replace(
      /(Title|Author|Date|Template): +([^\n]+)\n/gi,
      function(match, p1, p2) {
        switch(p1.toLowerCase()) {
          case 'title':
            if (data.title) return match;
            break;
          case 'author':
            if (data.author) return match;
            break;
          case 'date':
            if (data.date) return match;
            break;
          case 'template':
            if (data.template) return match;
        }
        data[p1.toLowerCase()] = p2;
        return '';
      }
    );
    data.title = data.title || file.split('/').pop().replace(/\.[^\.]+$/, '');
    data.url = file.replace(/^.+content/, '').replace(/\.[^\.]+$/, '');
    data.content = require('marked')(markdown);
    callback.call(self, data);
  });
};


/**
 * Transcompile `file` into CSS or JavaScript.
 *
 * @param String file
 * @param Function(output) callback
 * @api private
 */

gabby.transcompile = function(file, callback) {
  var self = this;
  var fileExt = file.split('.').pop().toLowerCase();
  for (var ext in this.transcompile) {
    if (this.transcompile.hasOwnProperty(ext) && ext === fileExt) {
      return this.transcompile[ext].call(this, file, callback);
    }
  }
  fs.readFile(file, 'utf8', function(err, output) {
    if (err) throw err;
    callback.call(self, output);
  });
};


/**
 * Transcompile CoffeeScript `file` into JavaScript.
 *
 * @param String file
 * @param Function(javascript) callback
 * @api private
 */

gabby.transcompile.coffee = function(file, callback) {
  var self = this;
  fs.readFile(file, 'utf8', function(err, coffeescript) {
    if (err) throw err;
    var javascript = require('coffee-script').compile(coffeescript);
    callback.call(self, javascript);
  });
};


/**
 * Transcompile Stylus `file` into CSS.
 *
 * @param String file
 * @param Function(css) callback
 * @api private
 */

gabby.transcompile.styl = function(file, callback) {
  var self = this;
  fs.readFile(file, 'utf8', function(err, stylus) {
    if (err) throw err;
    require('stylus').render(stylus, function(err, css) {
      if (err) throw err;
      callback.call(self, css);
    });
  });
};


/**
 * Transcompile LESS `file` into CSS.
 *
 * @param String file
 * @param Function(css) callback
 * @api private
 */

gabby.transcompile.less = function(file, callback) {
  var self = this;
  fs.readFile(file, 'utf8', function(err, less) {
    if (err) throw err;
    require('less').render(less, function(err, css) {
      if (err) throw err;
      callback.call(self, css);
    });
  });
};


/**
 * Transcompile SASS `file` into CSS.
 *
 * @param String file
 * @param Function(css) callback
 * @api private
 */

gabby.transcompile.sass = gabby.transcompile.scss = function(file, callback) {
  var self = this;
  fs.readFile(file, 'utf8', function(err, sass) {
    if (err) throw err;
    require('node-sass').render(sass, function(err, css) {
      if (err) throw err;
      callback.call(self, css);
    });
  });
};


/**
 * Render `template` file with given `data` and pass HTML result to callback.
 *
 * @param String template
 * @param Map data
 * @param Function(html) callback
 * @api private
 */

gabby.render = function(template, data, callback) {
  var fileExt = template.split('.').pop().toLowerCase();
  for (var ext in this.render) {
    if (this.render.hasOwnProperty(ext) && ext === fileExt) {
      return this.render[ext].call(this, template, data, callback);
    }
  }
  this.log.notice('File extension not supported for file: ' + template);
};


/**
 * Render Haml `template` file with given `data` and pass HTML result to
 * callback.
 *
 * @param String template
 * @param Map data
 * @param Function(html) callback
 * @api private
 */

gabby.render.haml = function(template, data, callback) {
  var self = this;
  fs.readFile(template, 'utf8', function(err, haml) {
    if (err) throw err;
    var html = require('haml-js').render(haml, {locals: data});
    callback.call(self, haml);
  });
};


/**
 * Render Plates `template` file with given `data` and pass HTML result to
 * callback.
 *
 * @param String template
 * @param Mixed data
 * @param Function(html) callback
 * @api private
 */

gabby.render.html = function(template, data, callback) {
  var self = this;
  fs.readFile(template, 'utf8', function(err, html) {
    if (err) throw err;
    html = require('plates').bind(html, data);
    callback.call(self, html);
  });
};


/**
 * Render Jade `template` file with given `data` and pass HTML result to
 * callback.
 *
 * @param String template
 * @param Mixed data
 * @param Function(html) callback
 * @api private
 */

gabby.render.jade = function(template, data, callback) {
  var self = this;
  fs.readFile(template, 'utf8', function(err, jade) {
    if (err) throw err;
    var html = require('jade').render(jade, {locals: data});
    callback.call(self, html);
  });
};

/**
 * Render Jade `template` file with given `data` and pass HTML result to
 * callback.
 *
 * @param String template
 * @param Mixed data
 * @param Function(html) callback
 * @api private
 */

gabby.render.jst = function(template, data, callback) {
  var self = this;
  fs.readFile(template, 'utf8', function(err, tmpl) {
    if (err) throw err;
    var html = require('underscore').template(tmpl, data);
    callback.call(self, html);
  });
};

/**
 * Create project skeleton.
 *
 * @api public
 */

gabby.createProjectSkeleton = function() {
  var self = this;
  this.log.started('Generating new project in ' + this.path);
  var skeleton = [
    'generated',
    'content',
    'content/index.md',
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
    'templates/layout.html',
    'templates/index.html'
  ];
  var sources = {
    'content/index.md': 'README.md',
    'public/images/background.png': 'src/public/images/background.png',
    'public/images/background@2x.png': 'src/public/images/background@2x.png',
    'public/images/favicon.png': 'src/public/images/favicon.png',
    'public/images/gabby.png': 'src/public/images/gabby.png',
    'templates/index.html': 'src/templates/index.html',
    'templates/layout.html': 'src/templates/layout.html',
    'styles/screen.styl': 'src/styles/screen.styl'
  };
  // Create skeleton project from src files.
  fs.mkdir(this.path, 0755, function(err) {
    if (!err) self.log.created(self.path, '90');
    async.forEachSeries(skeleton, function(item, next) {
      // File
      if (item.match(/\./)) {
        // Read from src and write to project directory.
        fs.readFile(__dirname + '/../' + sources[item], function(err, data) {
          if (err) return next(err);
          // Add markdown meta to README.md
          if (sources[item].match(/README\.md/)) {
            data = 'Title: Gabby — A beautifully simple static site generator\n'
                 + 'Author: Alex Mingoia\n'
                 + 'Date: 2013-01-24 16:20\n'
                 + 'Template: index.html\n\n'
                 + data;
            data = data.replace(
              'A beautifully simple static site generator for node.js.',
              '<h2 class="center">' +
                'A beautifully simple static site generator for node.js' +
              '</h2>'
            );
          }
          fs.writeFile(self.path + '/' + item, data, function(err) {
            if (err)  next(err);
            if (!err) {
              self.log.created(self.path + '/' + item, '90');
              next();
            }
          });
        });
      }
      // Directory
      else {
        fs.mkdir(self.path + '/' + item, 0755, function(err) {
          if (err)  next(err);
          if (!err) {
            self.log.created(self.path + '/' + item, '90');
            next();
          }
        });
      }
    },
    function(err) {
      if (err)  self.log.error(err);
      if (!err) self.log.finished('Your project is ready :)');
    });
  });
};

