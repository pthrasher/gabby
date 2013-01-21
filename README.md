Gabby
=====

A beautifully simple static site generator.

* Instant preview of file changes
* Articles and pages can be Markdown, Jade, Handlebars, or whatever you want
* Asset packaging and minification
* CoffeeScript, Stylus, LESS, and SASS support
* HTTP server with preconfigured routes, clean URLs, and caching
* CLI tool and static web server


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
      pages
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

    gabby listen website -p 3001 --debug

Then open ```http://localhost:3001``` in your web browser.

#### Instant preview

Start the server in ```--debug``` mode for changes to be reflected immediately.


Pages and definitions
--------------------------

### Pages

Pages are files (usually markdown) inside the ```pages```
directory, which are parsed and used as your site's HTML pages. The page file
names and directory structure will determine your URL structure.

### Page definitions

Page definitions are ```.json``` files inside the ```pages``` directory, which
give definition to the content file of the same name.

    {
      "title": "My first article",
      "date": "2013-01-01 16:20",
      "author": "First Last <author@email.com>",
      "template": "article.jade" // Optional. Overrides layout template.
    }

For example, you may have an ```/about``` page with content stored in ```about.md```
and the template specified in ```about.json```.

#### Markdown

Markdown files do not need a ```.json``` page definition and can use meta
text at the top of the file:

    Title: My first post
    Date: 2013-01-01 16:20
    Author: First Last <author@email.com>
    Template: article.jade


Directory structure
-------------------

```generated``` is where all of your HTML and other static files are output.  
```pages``` defines your URL structure and contains markdown articles or json
page definitions.  
```public``` is for images and other public files.  
```scripts``` is for JavaScript or CoffeeScript.  
```styles``` is for CSS, SASS, LESS, or Stylus.  
```templates``` is for HTML, Haml, Jade, EJS, or Handlebars templates.


Template variables
------------------

```content``` page content.  
```pageAuthor``` page author.  
```pageDate``` page date.  
```pageTitle``` page title.


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
