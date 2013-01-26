Gabby
=====

A beautifully simple static site generator for node.js.

* Instant preview of file changes.
* Use markdown or JSON object for page content.
* Asset packaging and minification.
* Templates with Jade, Plates, and Haml support.
* CoffeeScript, Stylus, LESS, and SASS support.
* HTTP server with preconfigured routes, clean URLs, and caching.
* CLI tool and static web server.


Install
-------

    npm install -g gabby

Once installed you can use the CLI. For available commands use the
```--help``` option.


Get started
-----------

### Create project

    gabby init website

That will create the following directory structure:

    website/
      generated
      content
        index.md
      public
        images
          favicon.png
          gabby.png
      scripts
      styles
        screen.styl
      templates
        layout.html

### Start the HTTP server

    gabby listen website

Then open ```http://localhost:3001``` in your web browser.

#### Instant preview

Start the server in ```--debug``` mode for changes to be reflected immediately.


Page content and templates
--------------------------

Page content is defined by files in the ```content``` directory. The file names
and directory structure will determine your URL structure. Content files may
either be markdown or JSON.

### JSON

JSON content files are parsed into a ```data``` object used to render the
template. Some properties are reserved for use by Gabby, such as the
```template``` property, which specifies the template file to use with
this data.

    {
      "title": "My first article",
      "date": "2013-01-01 16:20",
      "author": "First Last <author@email.com>",
      "template": "article.jade" // Optional. Overrides layout template.
    }

If no template is specified, the default layout template will be used.

### Markdown

Markdown files must have metadata at the top of the file:

    Title: My first post
    Date: 2013-01-01 16:20
    Author: First Last <author@email.com>
    Template: article.jade

This metadata is added as properties to the ```data``` object used to render the
template. The rest of the file will be converted to HTML and stored in
```data.content```. If no template is specified, the default layout template
will be used.


Directory structure
-------------------

```generated``` is where all of your HTML and other static files are output.  
```content``` defines your URL structure and contains markdown articles or json
content.  
```public``` is for images and other public files.  
```scripts``` is for JavaScript or CoffeeScript.  
```styles``` is for CSS, SASS, LESS, or Stylus.  
```templates``` is for HTML, Haml, Jade, EJS, or Handlebars templates.


Template variables
------------------

```content``` page content.  
```author``` page author.  
```date``` page date.  
```title``` page title.


JavaScript API
--------------

### Gabby([path])

Create a new Gabby project from given ```path```.

##### Arguments

```path``` String. Project path.

##### Returns

Returns ```gabby``` instance.

### gabby.createProjectSkeleton()

Create project directory skeleton if it doesn't exist.

### gabby.build()

Build static files and update ```generated``` folder.


Donations
---------

If you like using Gabby, tip me some bits @ 1MUaP1e5DcuWrup7nLwK1rBfLR7YCcjnqS
