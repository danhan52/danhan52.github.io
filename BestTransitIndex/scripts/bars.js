var margin = {top: 20, right: 231, bottom: 60, left: 40},
    width = 1000 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

var xscale = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);
    
var yscale = d3.scale.linear()
    .rangeRound([height, 0]);

var colors = d3.scale.ordinal()
    .range(['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a']);
    // .range(["#4DA296", "#BFCE82", "#7E89A9", "#BB4F41", "#4080A2", "#BD8331", "#73AD38", "#BC9CB4", "#99A8A8", "#7C4F8C"]);
    // .range(["#5CA296", "#CECE82", "#8D89A9", "#CA4F41", "#4F80A2", "#CC8331", "#82AD38", "#CB9CB4", "#A8A8A8", "#8B4F8C"]);
    // .range(['#8dd3c7','#ffffb3','#bebada','#fb8072','#80b1d3','#fdb462','#b3de69','#fccde5','#d9d9d9','#bc80bd']);
    // .range(["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395"]);// "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"]);
    
var xaxis = d3.svg.axis()
    .scale(xscale)
    .orient("bottom");
    
var yaxis = d3.svg.axis()
    .scale(yscale)
    .orient("left")
    .tickFormat(d3.format(".1f")); // **
    
var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var div = d3.select("body").append("div")   
    .attr("class", "tooltip")               
    .style("opacity", 0);

var statelist = [];
var isfiltered = false;
var sortby = "sta";

// load and handle the data
d3.csv("data/da.csv", function(error, data) {
    // rotate the data
    var categories = d3.keys(data[0]).filter(function(key) { return key !== "Absolutes"; });
    var parsedata = categories.map(function(name) { return { "Absolutes": name }; });
    data.forEach(function(d) {
        parsedata.forEach(function(pd) {
            pd[d["Absolutes"]] = d[pd["Absolutes"]];
        });
    });
    
    // map column headers to colors (except for 'Absolutes' and 'Base: All Respondents')
    colors.domain(d3.keys(parsedata[0]).filter(function(key) { return key !== "Absolutes" && key !== "Base: All Respondents"; }));
    
    var multdata = getModData(parsedata);
    
    // ordinal-ly map categories to x positions
    xscale.domain(multdata.map(function(d) { return d.Absolutes; }));
    
    // add the x axis and rotate its labels
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xaxis)
        .selectAll("text")
        .attr("y", 5)
        .attr("x", 7)
        .attr("dy", ".35em")
        .attr("transform", "rotate(65)")
        .style("text-anchor", "start");

    // add the y axis
    yscale.domain([0, d3.max(multdata, function(d) { return d.totalresponses; })]);
    svg.append("g")
        .attr("class", "y axis")
        .call(yaxis);
    
    /////////////////////////////////////////////////////////////////
    // create svg groups ("g") and place them
    /////////////////////////////////////////////////////////////////
    var circies = svg.selectAll(".idot")
        .data(multdata)
        .enter().append("circle")
        .attr("class", "idot")
        .attr("id", function(d) { return d.Absolutes; })
        .attr("fill", "red")
        .attr("r", 5)
        .attr("transform", function(d) { return "translate(" + 
            (xscale(d.Absolutes)+xscale.rangeBand()) + "," + 
            (height + 30) + ")"; })
        .attr("opacity", 0);
        

    var category = svg.selectAll(".category")
        .data(multdata)
        .enter().append("g")
        .attr("class", "category")
        .attr("transform", function(d) { return "translate(" + xscale(d.Absolutes) + ",0)"; })
        .on("click", function(d) {
            var inlist = statelist.indexOf(d.Absolutes);
            if (inlist === -1) {
                d3.select("#" + d.Absolutes)
                    .attr("opacity", 1);
                statelist.push(d.Absolutes);
            } else {
                d3.select("#" + d.Absolutes)
                    .attr("opacity", 0);
                statelist.splice(inlist, 1);
            }
            if (isfiltered) {
                transitionScale();
            }
        });
    
    /////////////////////////////////////////////////////////////////
    // draw the rects within the groups
    /////////////////////////////////////////////////////////////////
    category.selectAll("rect")
        .data(function(d) { return d.responses; })
        .enter().append("rect")
        .attr("width", xscale.rangeBand())
        .attr("y", function(d) { return yscale(d.y1); })
        .attr("height", function(d) { return yscale(d.y0) - yscale(d.y1); })
        .style("fill", function(d) { return colors(d.response); })
        .on("mouseover", function(d) {
            div.transition(100).style("opacity", .9);
            div.html(d.state + "<br/>" + d.response + "<br/>" + Math.round(d.acc*100)/100)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 50) + "px");
            if((r = $(this).css("fill").match(/(\d+),\s*(\d+),\s*(\d+)/i))) {
                for(var i = 1; i < 4; i++) {
                    r[i] = Math.round(r[i] * .8);
                }
                $(this).attr("fill-old", $(this).css("fill"));
                $(this).css("fill", 'rgb('+r[1]+','+r[2]+','+r[3]+')');
            }
        })
        .on("mouseout", function(d) {
            div.transition()
                .duration(100)
                .style("opacity", 0);
            if($(this).attr("fill-old")) $(this).css("fill", $(this).attr("fill-old"));
        });
    
    /////////////////////////////////////////////////////////////////
    // position the legend elements
    /////////////////////////////////////////////////////////////////
    var legend = svg.selectAll(".legend")
        .data(colors.domain())
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(20," + ((height - 18) - (i * 20)) + ")"; });

    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", colors)
        .on("click", function(d, i) {
            for (j = 1; j < 11; j++) {
                var rnam = "range" + j;
                if ((i+1) === j) {
                    document.getElementById(rnam).value = 1;
                } else {
                    document.getElementById(rnam).value = 0;
                }
            }
            transitionScale();
        })
        .on("dblclick", function(d, i) {
            for (j = 1; j < 11; j++) {
                var rnam = "range" + j;
                if ((i+1) === j) {
                    document.getElementById(rnam).value = -1;
                } else {
                    document.getElementById(rnam).value = 0;
                }
            }
            transitionScale();
        })
        .on("mouseover", function(d) {
            if((r = $(this).css("fill").match(/(\d+),\s*(\d+),\s*(\d+)/i))) {
                for(var i = 1; i < 4; i++) {
                    r[i] = Math.round(r[i] * .8);
                }
                $(this).attr("fill-old", $(this).css("fill"));
                $(this).css("fill", 'rgb('+r[1]+','+r[2]+','+r[3]+')');
            }
        })
        .on("mouseout", function(d) {
            if($(this).attr("fill-old")) $(this).css("fill", $(this).attr("fill-old"));
        });

    legend.append("text")
        .attr("x", width + 10)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "start")
        .text(function(d) { return d; });
    

    /////////////////////////////////////////////////////////////////
    // animation and reactive elements
    /////////////////////////////////////////////////////////////////
    d3.selectAll("input").on("change", handleFormClick);
    function handleFormClick() {
        if (this.value === "sta") {
            sortby = "sta";
            sortBars();
        } else if (this.value === "val") {
            sortby = "val";
            sortBars();
        } else {
            transitionScale();
        }
    }

    document.getElementById("reset").onclick = function() {
        resetSliders();
    };

    // select only the states that we want
    document.getElementById("stateSelect").onclick = function() {
        isfiltered = this.value === "Filter states";
        transitionScale();
        if (this.value === "Filter states") {
            this.value = "Back to all"; 
        } else {
            this.value = "Filter states";
        }
    };

    document.getElementById("deselectStates").onclick = function() {
        d3.selectAll(".idot")
            .attr("opacity", 0);
        statelist = [];
        transitionScale();
        
    };

    

    /////////////////////////////////////////////////////////////////
    // sort the stacked bars by either value or by state
    /////////////////////////////////////////////////////////////////
    function sortBars() {
        // sort by the value in 'Right Direction'
        var multdata = getModData(parsedata);

        var x0 = xscale.domain(multdata.sort(sortby === "val"
            ? function(a, b) { return b.totalresponses - a.totalresponses; }
            : function(a, b) { return d3.ascending(a.Absolutes, b.Absolutes); })
            .map(function(d) { return d.Absolutes; }))
            .copy();

        svg.selectAll(".category")
            .sort(function(a,b) { return x0(a.Absolutes) - x0(b.Absolutes); });

        var transition = svg.transition().duration(750);
        var delay = function(d, i) { return i*30; };

        transition.selectAll(".category")
            .delay(delay)
            .attr("transform", function(d) { return "translate(" + x0(d.Absolutes) + ",0)"; });
        transition.select(".x.axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xaxis)
            .selectAll("text")
            .attr("y", 5)
            .attr("x", 7)
            .attr("dy", ".35em")
            .attr("transform", "rotate(65)")
            .style("text-anchor", "start");


    transition.selectAll(".idot")
        .attr("transform", function(d) { return "translate(" + 
            (x0(d.Absolutes)+x0.rangeBand()) + "," + 
            (height + 30) + ")"; });
    }
    
    /////////////////////////////////////////////////////////////////
    // change the height of the bars based on the weights from the sliders
    /////////////////////////////////////////////////////////////////
    function transitionScale() {
        var multdata = getModData(parsedata);
        // set the yscale domain
        yscale.domain([0, d3.max(multdata, function(d) { return d.totalresponses; })]);
        
        var x0 = xscale.domain(multdata.sort(sortby === "val"
            ? function(a, b) { return b.totalresponses - a.totalresponses; }
            : function(a, b) { return d3.ascending(a.Absolutes, b.Absolutes); })
            .map(function(d) { return d.Absolutes; }))
            .copy();

        svg.selectAll(".category")
            .sort(function(a,b) { return x0(a.Absolutes) - x0(b.Absolutes); });

        // change size (step one)
        var categoriesone = svg.selectAll(".category")
            .data(multdata);
        categoriesone.selectAll("rect")
            .data(function(d) { return d.responses; })
          .transition().duration(450)
            .attr("height", function(d) { return yscale(d.y0) - yscale(d.y1); })
            .attr("y", function(d) { return yscale(d.y1) });

        // change the y-axis
        svg.selectAll(".y.axis").transition().call(yaxis);
        if (sortby === "val") {
            sortBars();
        }
    }

    /////////////////////////////////////////////////////////////////
    // resets all range inputs to 0.5
    /////////////////////////////////////////////////////////////////
    function resetSliders() {
        for (i = 1; i < 11; i++) {
            var rnam = "range" + i;
            document.getElementById(rnam).value = 0.5;
        }
        transitionScale();
    }
});

/////////////////////////////////////////////////////////////////
// get the values of the range inputs in an array
/////////////////////////////////////////////////////////////////
function getRangeVals() {
    var rv = [];
    for (i = 1; i < 11; i++) {
        var rnam = "range" + i;
        rv.push(+document.getElementById(rnam).value);
    }
    return rv;
}

/////////////////////////////////////////////////////////////////
// create a new data object whose data is scaled by the weight values 
// found as the range inputs
/////////////////////////////////////////////////////////////////
function getModData(dat) {
    var mult = getRangeVals();
    var newdat = jQuery.extend(true, [], dat);
    var maxes = [7505, 5545397.09090909, 407304294.2, 82074061.6, 44.035,
        72.7875, 31.485, 154364.05, 2362654.47777778, 626.722222222222];
    

    // add a 'responses' parameter to each row that has the height percentage values for each rect
    newdat.forEach(function(pd) {
        var y0 = 0;
        // colors.domain() is an array of the column headers (text)
        // pd.responses will be an array of objects with the column header
        // and the range of values it represents
        pd.responses = colors.domain().map(function(response, i) {
            var responseobj = {response: response, y0: y0};
            responseobj.state = pd.Absolutes;
            responseobj.acc = +pd[response];
            if (!isfiltered || (statelist.indexOf(pd.Absolutes) !== -1)) {
                if (mult[i] > 0) {
                    y0 += +pd[response] * mult[i] / maxes[i];
                } else if (mult[i] <= 0) {
                    y0 += (1 - +pd[response] / maxes[i]) * Math.abs(mult[i]);
                }
            } 
            responseobj.y1 = y0;
            return responseobj;
        });
        // save the total
        pd.totalresponses = pd.responses[pd.responses.length - 1].y1;
    });

    return newdat;
} 

d3.select(self.frameElement).style("height", (height + margin.top + margin.bottom) + "px");

