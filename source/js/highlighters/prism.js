// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.
var utils = require('../utils.js');
var superset = require('../superset.js');
var highlighter = require('./highlighter.js');
var prism = require('../../components/prism.js');

/**
 * Listens to a model and highlights the text accordingly.
 * @param {DocumentModel} model
 */
var PrismHighlighter = function(model, row_renderer) {
    highlighter.HighlighterBase.call(this, model, row_renderer);

    // Look back and forward this many rows for contextually 
    // sensitive highlighting.
    this._row_padding = 15;
    this._language = null;

    // Properties
    this.property('languages', function() {
        var languages = [];
        for (var l in prism.languages) {
            if (prism.languages.hasOwnProperty(l)) {
                if (["extend", "insertBefore", "DFS"].indexOf(l) == -1) {
                    languages.push(l);
                }
            }
        }
        return languages;
    });
};
utils.inherit(PrismHighlighter, highlighter.HighlighterBase);

/**
 * Highlight the document
 * @return {null}
 */
PrismHighlighter.prototype.highlight = function(start_row, end_row) {
    // Get the first and last rows that should be highlighted.
    start_row = Math.max(0, start_row - this._row_padding);
    end_row = Math.min(this._model._rows.length - 1, end_row + this._row_padding);

    // Abort if language isn't specified.
    if (!this._language) return;
    
    // Get the text of the rows.
    var text = this._model.get_text(start_row, 0, end_row, this._model._rows[end_row].length);

    // Figure out where each tag belongs.
    var highlights = this._highlight(text); // [start_index, end_index, tag]
    
    // Calculate Poster tags
    var that = this;
    highlights.forEach(function(highlight) {

        // Translate tag character indicies to row, char coordinates.
        var before_rows = text.substring(0, highlight[0]).split('\n');
        var group_start_row = start_row + before_rows.length - 1;
        var group_start_char = before_rows[before_rows.length - 1].length;
        var after_rows = text.substring(0, highlight[1]).split('\n');
        var group_end_row = start_row + after_rows.length - 1;
        var group_end_char = after_rows[after_rows.length - 1].length;

        // Apply tag if it's not already applied.
        var tag = highlight[2].toLowerCase();
        var existing_tags = that._model.get_tag_values('syntax', group_start_row, group_start_char, group_end_row, group_end_char);
        if (existing_tags.length !== 1 || existing_tags[0] !== tag) {
            that._model.set_tag(group_start_row, group_start_char, group_end_row, group_end_char, 'syntax', tag);
        }
    });
};

/**
 * Find each part of text that needs to be highlighted.
 * @param  {string} text
 * @return {array} list containing items of the form [start_index, end_index, tag]
 */
PrismHighlighter.prototype._highlight = function(text) {

    // Tokenize using prism.js
    var tokens = prism.tokenize(text, this._language);

    // Convert the tokens into [start_index, end_index, tag]
    var left = 0;
    var flatten = function(tokens, prefix) {
        if (!prefix) { prefix = []; }
        var flat = [];
        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            if (token.content) {
                flat = flat.concat(flatten([].concat(token.content), prefix.concat(token.type)));
            } else {
                if (prefix.length > 0) {
                    flat.push([left, left + token.length, prefix.join(' ')]);
                }
                left += token.length;
            }
        }
        return flat;
    };
    var tags = flatten(tokens);

    // Use a superset to reduce overlapping tags.
    var set = new superset.Superset();
    set.set(0, text.length-1, '');
    tags.forEach(function(tag) {
        set.set(tag[0], tag[1]-1, tag[2]);
    });
    return set.array;
};

/**
 * Loads a syntax by language name.
 * @param  {string or dictionary} language
 * @return {boolean} success
 */
PrismHighlighter.prototype.load = function(language) {
    try {
        // Check if the language exists.
        if (prism.languages[language] === undefined) {
            throw new Error('Language does not exist!');
        }
        this._language = prism.languages[language];
        this._queue_highlighter();
        return true;
    } catch (e) {
        console.error('Error loading language', e);
        this._language = null;
        return false;
    }
};

// Exports
exports.PrismHighlighter = PrismHighlighter;
