var base_url =  location.hostname == "memetrades.com" ? ".." : "http://memetrades.com";

var svg = d3.select("svg"),
	width = window.innerWidth || +svg.attr("width"),
	height = window.innerHeight || +svg.attr("height");

// Set width and height
svg.attr("width", width).attr("height", height);

// Zoom
svg.call(d3.zoom().on("zoom", function () {
	svg.select("g").attr("transform", d3.event.transform); // Austin wrote this
}));

// TODO more colors
var color = d3.scaleOrdinal(d3.schemeCategory20);

var menu = [
{
	title: "Buy stock",
	action: (elm, d, i) => { buyMeme(d.name); }
},
{ divider: true },
{
	title: "Sell stock",
	action: (elm, d, i) => { sellMeme(d.name); }
},
];


// Force directed graph simulation
var simulation = d3.forceSimulation()
	.force("link", d3.forceLink().id((d) => d.id))
	.force("gravity", d3.forceManyBody().strength(1)) // d.mass?
	.force("collide", d3.forceCollide((d) => d.radius))
	.force("center", d3.forceCenter(width / 2, height / 2));

// Tooltip
var tooltip = d3.select("body")
	.append("div")
	.attr("class", "d3-tip")
	.style("position", "absolute")
	.style("z-index", "10")
	.style("visibility", "hidden");

// onready
$(document).ready(function() {
	// Fetch data from JSON
	getData();
});

function getData() {
	d3.json(base_url + "/api/stocks", function (error, json) {
		if (error) throw error;

		// Scrape JSON
		var data = scrapeJSON(json);

		/*
		// Create link
		var link = svg.append("g")
		.attr("class", "links")
		.selectAll("line")
		.data(graph.links)
		.enter().append("line")
		.attr("stroke-width", (d) => Math.sqrt(d.value));
		 */

		// Get node selection node
		var node = svg.append("g")
			.attr("class", "nodes")
			.selectAll("circle")
			.data(data);

		var circle = appendCircle(node.enter());
		updateCircle(circle);
		window.circle = circle;

		simulation
			.nodes(data)
			.on("tick", ontick);

		/* simulation.force("link")
		   .links(graph.links);
		 */
	});
}

function updateData() {
	d3.json(base_url + "/api/stocks", function (error, json) {
		if (error) throw error;

		// Scrape data
		var data = scrapeJSON(json);

		// TODO test: add mock data
		// var mock = { name: "TEST", price: 1000 * Math.random() };
		// data.push(mock);
		// console.log(mock);

		// Update nodes and add new ones as needed
		var node = svg.select("g")
			.selectAll("circle")
			.data(data);

		// Update existing circles
		var circle = appendCircle(node);
		updateCircle(circle);
		window.circle = circle;

		// Add new circles
		var circleEnter = appendCircle(node.enter());
		updateCircle(circleEnter);

		// Remove unneeded circles
		circle.exit().remove();

		// TODO Show count
		var count = 0;
		node.each((d) => { count++; });
		console.log(count);

		simulation
			.nodes(data)
			.on("tick", ontick);
		simulation.restart();

	});
}

/* Events */
function ontick() {
	// Update values
	/*
	   link
	   .attr("x1", (d) => d.source.x)
	   .attr("y1", (d) => d.source.y)
	   .attr("x2", (d) => d.target.x)
	   .attr("y2", (d) => d.target.y);
	   */

	window.circle
		.attr("cx", (d) => d.x)
		.attr("cy", (d) => d.y);
}

function ondragstart(d) {
	if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
}

function ondrag(d) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
	moveTooltip(d);
}

function ondragend(d) {
	if (!d3.event.active) simulation.alphaTarget(0);
	d.fx = null;
	d.fy = null;
}

function onmouseover(d) {
	d3.select(this).transition()
		.attr("style", (d) => "stroke: black; stroke-width: " + (0.045 * d.radius < 3 ? 3 : 0.045 * d.radius));
	showTooltip(d);
}

function onmouseout(d) {
	d3.select(this).transition()
		// .attr("style", (d) => "stroke: " + d.color + "; stroke-width: 0");
		.attr("style", (d) => "stroke: black; stroke-width: 0");
	hideTooltip();
}

function onmousemove(d) {
	moveTooltip(d);
}

function onclick(d) {
	// TODO tmp
	// updateData();
}

/* Helpers */
// Scrape JSON into a list of stocks of { name, price }
function scrapeJSON(json) {
	var data = [];
	json.forEach((key, value) => {
		var stock = { name: key.name, price: key.price, trend: key.trend };
		data.push(stock);
	});
	return data;
}

function appendCircle(node) {
	return node.append("circle")
		.attr("class", "node");
}

function updateCircle(circle) {
	// Set cutom properties
	// Don't use arrow function => because `this` is rebound
	circle.each(function (d, i, nodes) {
		d.color = color(d.name);
		d.color_hover = color(d.name+1); // change it a bit TODO
		d.radius = d.price;
	});

	// Title (on hover)
	circle.append("title")
		.text((d) => d.name);

	// Size and color
	circle.transition()
		.attr("r", (d) => d.radius)
		.attr("fill", (d) => d.color)
		.attr("style", "stroke-width: 0");

	// Mouse events
	circle.call(d3.drag()
			.on("start", ondragstart)
			.on("drag", ondrag)
			.on("end", ondragend))
		.on("mouseover", onmouseover)
		.on("mouseout", onmouseout)
		.on("mousemove", onmousemove)
		.on("click", onclick)
		.on("contextmenu", d3.contextMenu(menu, {
			onOpen: () => { },
			onClose: () => { }
		}));

	return circle;
};

function showTooltip(d) {
	var html = "<strong>Stock:</strong> <span style='color:red'>" + d.name + "</span><br>";
	html += "<strong>Price:</strong> <span style='color:red'>" + d.price + "</span><br>";
	tooltip.style("visibility", "visible").html(html);
}

function moveTooltip(d) {
	// TODO put directly above node
	tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");
}

function hideTooltip() {
	tooltip.style("visibility", "hidden");
}

// This is the same as in index.js
// Should probably move to a common file
function sell() {
    var meme = document.getElementById("meme").value;
    $.get(base_url+"/api/sell", {meme: meme}, update)
}


function buy() {
    var meme = document.getElementById("meme").value;
    $.get(base_url+"/api/buy", {meme: meme}, update)
}
