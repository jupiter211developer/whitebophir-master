/**
 *                  WHITEBOPHIR SERVER
 *********************************************************
 * @licstart  The following is the entire license notice for the 
 *  JavaScript code in this page.
 *
 * Copyright (C) 2013-2014  Ophir LOJKINE
 *
 *
 * The JavaScript code in this page is free software: you can
 * redistribute it and/or modify it under the terms of the GNU
 * General Public License (GNU GPL) as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option)
 * any later version.  The code is distributed WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.
 *
 * As additional permission under GNU GPL version 3 section 7, you
 * may distribute non-source (e.g., minimized or compacted) forms of
 * that code without the copy of the GNU GPL normally required by
 * section 4, provided you include this license notice and a URL
 * through which recipients can access the Corresponding Source.
 *
 * @licend
 * @module boardData
 */

var log = require("./log.js").log
	, path = require("path")
	, config = require("./configuration.js");

const db = require('./db/db.js');

/**
 * Represents a board.
 * @constructor
 */
var BoardData = function (name) {
	this.name = name;
	this.board = {};
	this.lastSaveDate = Date.now();
	this.users = new Set();
};

/** Adds data to the board */
BoardData.prototype.set = function (id, data) {
	//KISS
	data.time = Date.now();
	this.validate(data);
	this.board[id] = data;
	this.addDataToBoard(id, data);
};

BoardData.prototype.getImagesCount = async function (boardName, data) {
	let images = await db.getBoardData(boardName, 'doc');

	return images.length;
};

/** Adds data to the board */
BoardData.prototype.updateBoard = async function (id, data) {
	this.validate(data);

	let board = await db.getBoard(this.name);

	board.board[id] = data;

	db.updateBoard(this.name, board.board);
};

/** Adds a child to an element that is already in the board
 * @param {string} parentId - Identifier of the parent element.
 * @param {object} child - Object containing the the values to update.
 * @returns {boolean} - True if the child was added, else false
 */
BoardData.prototype.addChild = function (parentId, child) {
	var obj = this.board[parentId];
	if (typeof obj !== "object") return false;
	if (Array.isArray(obj._children)) obj._children.push(child);
	else obj._children = [child];

	this.validate(obj);

	this.updateBoardData(parentId, obj);
	return true;
};

/** Update the data in the board
 * @param {string} id - Identifier of the data to update.
 * @param {object} data - Object containing the values to update.
 * @param {boolean} create - True if the object should be created if it's not currently in the DB.
*/
BoardData.prototype.update = function (id, data, create) {
	delete data.type;
	delete data.tool;
	var obj = this.board[id];
	if (typeof obj === "object") {
		for (var i in data) {
			obj[i] = data[i];
		}
	}

	if (create || obj === undefined) {
		this.board[id] = data;
		this.addDataToBoard(id, data);
	} else {
		this.updateBoardData(id, obj);
	}
};

/** Removes data from the board
 * @param {string} id - Identifier of the data to delete.
 */
BoardData.prototype.delete = function (id) {
	//KISS
	delete this.board[id];
	db.deleteBoardData(this.name, id);
};

/** Reads data from the board
 * @param {string} id - Identifier of the element to get.
 * @returns {object} The element with the given id, or undefined if no element has this id
 */
BoardData.prototype.get = function (id, children) {
	return this.board[id];
};

/** Reads data from the board
 * @param {string} [id] - Identifier of the first element to get.
 * @param {BoardData~processData} callback - Function to be called with each piece of data read
 */
BoardData.prototype.getAll = function (id) {
	var results = [];
	for (var i in this.board) {
		if (!id || i > id) {
			results.push(this.board[i]);
		}
	}
	return results;
};

/**
 * 
 */
BoardData.prototype.addUser = function addUser(userId) {

}

/**
 * This callback is displayed as part of the BoardData class.
 * Describes a function that processes data that comes from the board
 * @callback BoardData~processData
 * @param {object} data
 */


/** Delays the triggering of auto-save by SAVE_INTERVAL seconds
*/
BoardData.prototype.delaySave = function (id, data) {
	this.save.bind(this);
	this.save(id, data);
	// if (this.saveTimeoutId !== undefined) clearTimeout(this.saveTimeoutId);
	// this.saveTimeoutId = setTimeout(this.save.bind(this), config.SAVE_INTERVAL);
	// if (Date.now() - this.lastSaveDate > config.MAX_SAVE_DELAY) setTimeout(this.save.bind(this), 0);
};

/** Saves the data in the board to a mongodb. */
BoardData.prototype.save = async function (id, data) {
	// this.lastSaveDate = Date.now();
	db.addDataToBoard(this.name, id, data);
};

/** Saves the data in the board to a mongodb. */
BoardData.prototype.addDataToBoard = async function (id, data) {
	db.addDataToBoard(this.name, id, data);
};

/** Saves the data in the board to a mongodb. */
BoardData.prototype.updateBoardData = async function (id, data) {
	db.updateBoardData(this.name, id, data);
};

/** Remove old elements from the board */
BoardData.prototype.clean = function cleanBoard() {
	var board = this.board;
	var ids = Object.keys(board);
	if (ids.length > config.MAX_ITEM_COUNT) {
		var toDestroy = ids.sort(function (x, y) {
			return (board[x].time | 0) - (board[y].time | 0);
		}).slice(0, -config.MAX_ITEM_COUNT);
		for (var i = 0; i < toDestroy.length; i++) delete board[toDestroy[i]];
	}
}

/** Remove all elements from the board */
BoardData.prototype.clearAll = function() {
	db.deleteAllBoardData(this.name)
	this.board = {};
}

/** Reformats an item if necessary in order to make it follow the boards' policy 
 * @param {object} item The object to edit
 * @param {object} parent The parent of the object to edit
*/
BoardData.prototype.validate = function validate(item, parent) {
	if (item.hasOwnProperty("size")) {
		item.size = parseInt(item.size) || 1;
		item.size = Math.min(Math.max(item.size, 1), 50);
	}
	if (item.hasOwnProperty("x") || item.hasOwnProperty("y")) {
		item.x = parseFloat(item.x) || 0;
		item.x = Math.min(Math.max(item.x, 0), config.MAX_BOARD_SIZE_X);
		item.x = Math.round(10 * item.x) / 10;
		item.y = parseFloat(item.y) || 0;
		item.y = Math.min(Math.max(item.y, 0), config.MAX_BOARD_SIZE_Y);
		item.y = Math.round(10 * item.y) / 10;
	}
	if (item.hasOwnProperty("opacity")) {
		item.opacity = Math.min(Math.max(item.opacity, 0.1), 1) || 1;
		if (item.opacity === 1) delete item.opacity;
	}
	if (item.hasOwnProperty("_children")) {
		if (!Array.isArray(item._children)) item._children = [];
		if (item._children.length > config.MAX_CHILDREN) item._children.length = config.MAX_CHILDREN;
		for (var i = 0; i < item._children.length; i++) {
			this.validate(item._children[i]);
		}
	}
}

/** Load the data in the board from a mongoDb.
 * @param {string} name - name of board
*/
BoardData.load = async function loadBoard(name) {
	var boardData = new BoardData(name);
	const boardFromDb = await db.getBoard(name);
	const boardDataObj = await db.getBoardData(name);

	boardData.board = boardFromDb ? boardFromDb.board : null;
	if (!boardData.board) {
		boardData.board = {};
	} else {
		for (id in boardDataObj) {
			if (boardDataObj[id] && boardDataObj[id].data) {
				boardData.board[boardDataObj[id].id] = boardDataObj[id].data;
			}
		}

		for (id in boardData.board) {
			boardData.validate(boardData.board[id]);
		}
	}

	return boardData;
};

module.exports.BoardData = BoardData;
