/*
    javascript functions for Visualizer.html
    Requires:d3-v3, jquery-v1.5
*/

/*jslint browser: true, devel: true*/
/*global d3, $, jQuery*/


var globalWrapper = (function (window, $, d3) {
    "use strict";
    // Private
    var w = 690,
        h = 690,
        svgObj,
        xScale = d3.scale.linear(),
        yScale = d3.scale.linear(),
        brush,
        setMath,
        metadata,
        plotMath,
        annotate,
        brushTools,
        plotConMap,
        initialize;
    
    function round(value, n) {
        // Round <value> to <n> decimal places
        var p,
            result;

        p = Math.pow(10, n);
        result = Math.round(value * p) / p;

        return result;
    } // END round

    setMath = (function (window, $, undef) {
        var pub = {};
        
        // Public Methods
        pub.intersect = function (a, b) {
            var ai = 0,
                bi = 0,
                result = [];

            while (ai < a.length && bi < b.length) {
                if (a[ai] < b[bi]) {
                    ai += 1;
                } else if (a[ai] > b[bi]) {
                    bi += 1;
                } else { /* they're equal */
                    result.push(a[ai]);
                    ai += 1;
                    bi += 1;
                }
            }

            return result;
        }; // END intersect

        pub.intersectMult = function (array2d) {
            var result = array2d[0].sort(),
                i;

            for (i = 1; i < array2d.length; i += 1) {
                result = pub.intersect(result, array2d[i].sort());
            }

            return result;
        }; // END intersectMult

        pub.union = function (a, b) {
            var ai = 0,
                bi = 0,
                result = [];

            while (ai < a.length && bi < b.length) {
                if (a[ai] < b[bi]) {
                    result.push(a[ai]);
                    ai += 1;
                } else if (a[ai] > b[bi]) {
                    result.push(b[bi]);
                    bi += 1;
                } else { /* they're equal */
                    result.push(a[ai]);
                    ai += 1;
                    bi += 1;
                }
            }

            if (ai === a.length && bi < b.length) {
                result = result.concat(b.slice(bi, b.length));
            } else if (bi === b.length && ai < a.length) {
                result = result.concat(a.slice(ai, a.length));
            }
            return result;
        }; // END union

        pub.unionMult = function (array2d) {
            var result = array2d[0].sort(),
                i;

            for (i = 1; i < array2d.length; i += 1) {
                result = pub.union(result, array2d[i].sort());
            }

            return result;
        }; // END unionMult

        pub.intersectFuzzy = function (array2d, fuzz) {
            var i,
                j,
                arrayLen = array2d.length,
                unionArray,
                numMatch,
                result = [];

            if (fuzz < 2 || fuzz > arrayLen || arrayLen === 1) {
                return;
            }

            if (arrayLen === 2 || arrayLen === fuzz) {
                result = pub.intersectMult(array2d);
            } else {
                unionArray = pub.unionMult(array2d);
                for (i = 0; i < unionArray.length; i += 1) {
                    numMatch = 0;
                    j = 0;
                    while (numMatch < fuzz && j < arrayLen) {
                        numMatch = numMatch + (array2d[j].indexOf(unionArray[i]) > -1);
                        j += 1;
                    }

                    if (numMatch === fuzz) {
                        result.push(unionArray[i]);
                    }
                }
            }

            return result;
        }; // END intersectFuzzy

        pub.unique = function (array1, array2) {
            var outArray = array1.filter(function (n) {
                return array2.indexOf(n) === -1;
            });

            return (outArray);
        }; // END unique
        
        return pub;
    }(window, jQuery)); // END setMath

    // Functions for populating info panel with metadata
    metadata = (function (window, $, undef) {
        var pub = {};
        
        // Private Methods
        function removeData(event) {
            if (typeof event === "undefined") {
                d3.select("#tableOne").select("tbody").selectAll("tr").remove();
                d3.select("#tableTwo").select("tbody").selectAll("tr").remove();
            } else if (event === 1) {
                d3.select("#tableOne").select("tbody").selectAll("tr").remove();
            } else if (event === 2) {
                d3.select("#tableTwo").select("tbody").selectAll("tr").remove();
            }
        } // END removeData

        function writeGenelistLink(genelist) {
            var str = "",
                i;

            if (genelist.length === 0) {
                d3.select("#exportGenelist")
                    .attr("href", "#");
                d3.select("#exportGenelist").select("button")
                    .classed("disabled", true);

            } else {
                d3.select("#exportGenelist").select("button")
                    .classed("disabled", false);

                for (i = 0; i < genelist.length; i += 1) {
                    str = str + genelist[i] + "\n";
                }

                d3.select("#exportGenelist")
                    .attr("href", "data:application/octet-stream;charset=utf-8;base64," + window.btoa(str))
                    .attr("download", "genelist.txt");
            }
        } // END writeGenelistLink

        // Public Methods
        pub.display = function (event) {
            var selectedPts = svgObj.selectAll(".selectedNode").data(),
                selectedEdge = svgObj.selectAll(".selectedEdge").data(),
                i,
                jac,
                tableOneObj,
                tableTwoObj,
                tableThreeObj,
                tableRowObj,
                panelObj,
                ptObj,
                geneArray = [],
                geneUnion,
                geneIntersect;

            if (selectedPts.length !== 0) {
                // Unhide tables, hide default text
                // unhideInfo();

                // Remove previous metadata in panels
                removeData();

                // Populate panel with metadata
                // 1. Gene Set Name(s)
                d3.select("#liveTextOneA").select("b")
                    .text(selectedPts.length); // # of selected gene sets

                tableOneObj = d3.select("#tableOne");
                for (i = 0; i < selectedPts.length; i += 1) {
                    ptObj = selectedPts[i];
                    geneArray[i] = ptObj.MemberGenes;

                    tableRowObj = tableOneObj.select("tbody").append("tr");
                    tableRowObj.append("td").append("a")
                        .attr("href", ptObj.url)
                        .attr("target", "_blank")
                        .text(ptObj["Gene.Set.Name"]);
                    tableRowObj.append("td")
                        .text(ptObj["gene.set.size"]);
                    tableRowObj.append("td")
                        .text("(" + round(ptObj.x, 3) + "," + round(ptObj.y, 3) + ")");
                }

                // Calculate union, intersect
                if (geneArray.length === 1) {
                    geneIntersect = geneArray[0].sort();
                    geneUnion = geneArray[0].sort();
                } else {
                    geneIntersect = setMath.intersectMult(geneArray);
                    geneUnion = setMath.unionMult(geneArray);
                }

                if (selectedPts.length === 2) {
                    jac = geneIntersect.length / geneUnion.length;
                    d3.select("#liveTextOneB").select("b")
                        .text(round(jac, 3)); // display Jaccard Index
                    d3.select("#liveTextOneB")
                        .classed("grayedText", false);
                } else {
                    d3.select("#liveTextOneB").select("b")
                        .text("NA"); // NA Jaccard Index
                    d3.select("#liveTextOneB")
                        .classed("grayedText", true);
                }

                // 2. Member Genes
                //// Default: intersect (all)
                d3.select("#liveTextTwoA").select("b")
                    .text(geneUnion.length); // live text
                d3.select("#liveTextTwoB").select("b")
                    .text(geneIntersect.length); // live text
                $("#fuzzFactor").val(selectedPts.length); // set intersect fuzz factor to # selected genesets
                d3.select("#fuzzWarning").classed("hidden", true); // turn off warning
                writeGenelistLink(geneIntersect); // write download link for new gene list
                tableTwoObj = d3.select("#tableTwo");
                if (geneIntersect.length === 0) {
                    tableTwoObj.select("tbody").append("tr")
                        .append("td")
                        .text("No overlapping genes found");
                } else {
                    for (i = 0; i < geneIntersect.length; i += 1) {
                        tableTwoObj.select("tbody").append("tr")
                            .append("td")
                            .text(geneIntersect[i]);
                    }
                }
                // 3. Annotation
                annotate.activate(geneIntersect);
            }
        }; // END metadata.display

        // Function to handle fuzzy overlap calls
        pub.fuzzFactorListen = function () {
            $(document).on('change', '#fuzzFactor', function () {
                var selectedPts = svgObj.selectAll(".selectedNode").data(),
                    i,
                    fuzz = parseInt(document.getElementById("fuzzFactor").value, 10),
                    geneArray = [],
                    geneUnion,
                    geneIntersectFuzzy,
                    tableTwoObj;

                if (fuzz < 1) {
                    // unhide warning
                    d3.select("#fuzzWarning").classed("hidden", false);
                    d3.select("#fuzzWarningText").text("Warning! Cannot overlap fewer than 1 gene set.");
                } else if (fuzz > selectedPts.length) {
                    // unhide warning
                    d3.select("#fuzzWarning").classed("hidden", false);
                    d3.select("#fuzzWarningText").text("Warning! Cannot overlap more gene sets than number selected (" + selectedPts.length + ").");
                } else {
                    // hide warning
                    d3.select("#fuzzWarning").classed("hidden", true);

                    for (i = 0; i < selectedPts.length; i += 1) {
                        geneArray[i] = selectedPts[i].MemberGenes;
                    }

                    if (selectedPts.length === 1) {
                        geneUnion = geneArray[0].sort();
                        geneIntersectFuzzy = geneUnion;
                    } else {
                        geneUnion = setMath.unionMult(geneArray);
                    }

                    if (fuzz === 1) {
                        geneIntersectFuzzy = geneUnion;
                    } else {
                        geneIntersectFuzzy = setMath.intersectFuzzy(geneArray, fuzz);
                    }

                    // Remove "Member Genes" metadata
                    removeData(2);

                    // Display fuzzy intersect
                    // 2. Member Genes
                    d3.select("#liveTextTwoA").select("b")
                        .text(geneUnion.length);
                    d3.select("#liveTextTwoB").select("b")
                        .text(geneIntersectFuzzy.length);

                    writeGenelistLink(geneIntersectFuzzy);
                    tableTwoObj = d3.select("#tableTwo");
                    for (i = 0; i < geneIntersectFuzzy.length; i += 1) {
                        tableTwoObj.select("tbody").append("tr")
                            .append("td")
                            .text(geneIntersectFuzzy[i]);
                    }

                    // 3. Annotation
                    annotate.activate(geneIntersectFuzzy);
                }
            });
        };
        
        return pub;
    }(window, jQuery)); // END metadata

    // Functions for calculating SVG display attributes, metrics
    plotMath = (function (window, $, undef) {
        var pub = {};
        
        // Private Methods
        function rotatePoint(delta, centerPt, objectIn) {
            var objectOut = {};

            objectOut.x = Math.cos(delta) * objectIn.x - Math.sin(delta) * objectIn.y + centerPt.x;
            objectOut.y = Math.sin(delta) * objectIn.x + Math.cos(delta) * objectIn.y + centerPt.y;

            return objectOut;
        } // END rotatePoint

        // Public Methods
        // Calculate path for cross shape at origin
        pub.interpolateCross = function (radius) {
            var inCornerXpos = xScale(0) + (radius / 3),
                outCornerXpos = xScale(0) + radius,
                inCornerXneg = xScale(0) - (radius / 3),
                outCornerXneg = xScale(0) - radius,
                inCornerYpos = h - (yScale(0) + (radius / 3)),
                outCornerYpos = h - (yScale(0) + radius),
                inCornerYneg = h - (yScale(0) - (radius / 3)),
                outCornerYneg = h - (yScale(0) - radius),
                x = [],
                y = [],
                i,
                outstr = "";

            x[0] = inCornerXpos;
            x[1] = inCornerXpos;
            x[2] = outCornerXpos;
            x[3] = outCornerXpos;
            x[4] = inCornerXpos;
            x[5] = inCornerXpos;
            x[6] = inCornerXneg;
            x[7] = inCornerXneg;
            x[8] = outCornerXneg;
            x[9] = outCornerXneg;
            x[10] = inCornerXneg;
            x[11] = inCornerXneg;

            y[0] = outCornerYpos;
            y[1] = inCornerYpos;
            y[2] = inCornerYpos;
            y[3] = inCornerYneg;
            y[4] = inCornerYneg;
            y[5] = outCornerYneg;
            y[6] = outCornerYneg;
            y[7] = inCornerYneg;
            y[8] = inCornerYneg;
            y[9] = inCornerYpos;
            y[10] = inCornerYpos;
            y[11] = outCornerYpos;

            for (i = 0; i < x.length; i += 1) {
                outstr = outstr + x[i] + "," + y[i] + " ";
            }

            return outstr;
        }; // END interpolateCross

        // Calculate relative path width given jaccard index
        pub.jaccard2Width = function (jac, jacMax, jacMin) {
            var outWidth;

            if (jacMax === jacMin) {
                outWidth = 2;
            } else {
                outWidth = (jac - jacMin) * 5 / (jacMax - jacMin) + 1;
            }

            return outWidth;
        }; // END jaccard2Width

        // Calculate path for pretty edges
        pub.calcEdgePath = function (ptA, ptB, r, theta, factor) {
            // ptA, ptB = start, end points [x,y], respectively
            // r = radius of end point circles
            // theta = angle at which path intersects circles
            // factor = thinness of path

            var delta = Math.atan((ptA.y - ptB.y) / (ptA.x - ptB.x)),
                centerPt = {x: (ptA.x + ptB.x) / 2,
                            y: (ptA.y + ptB.y) / 2},
                w = Math.sqrt(Math.pow(centerPt.x - ptA.x, 2) + Math.pow(centerPt.y - ptA.y, 2)),
                p = {x: w - r * Math.cos(theta),
                     y: r * Math.sin(theta)},
                points = [{}, {}, {}, {}],
                h = {x: w - r / Math.cos(theta) + factor * Math.tan(theta),
                     y: factor},
                handles = [{}, {}, {}, {}],
                outStr;

            points[0] = rotatePoint(delta, centerPt, {x: -p.x, y: p.y});
            points[1] = rotatePoint(delta, centerPt, {x: p.x, y: p.y});
            points[2] = rotatePoint(delta, centerPt, {x: p.x, y: -p.y});
            points[3] = rotatePoint(delta, centerPt, {x: -p.x, y: -p.y});

            handles[0] = rotatePoint(delta, centerPt, {x: -h.x, y: h.y});
            handles[1] = rotatePoint(delta, centerPt, {x: h.x, y: h.y});
            handles[2] = rotatePoint(delta, centerPt, {x: h.x, y: -h.y});
            handles[3] = rotatePoint(delta, centerPt, {x: -h.x, y: -h.y});

            outStr = "M" + points[0].x + " " + points[0].y + "C" + handles[0].x + " " + handles[0].y + " " + handles[1].x + " " + handles[1].y + " " + points[1].x + " " + points[1].y + "L" + points[2].x + " " + points[2].y + "C" + handles[2].x + " " + handles[2].y + " " + handles[3].x + " " + handles[3].y + " " + points[3].x + " " + points[3].y + "Z";

            return outStr;
        }; // END edgePath

        // Set X and Y scales (d3)
        pub.setScales = function (ext) {
            var padding = 100;

            xScale.domain([-ext, ext]);
            xScale.range([ padding, w - padding]);

            yScale.domain([-ext, ext]);
            yScale.range([ padding, h - padding]);
        }; // END setScales
        
        return pub;
    }(window, jQuery)); // END plotMath

    // Functions for online annotation queries
    annotate = (function (window, $, undef) {
        var pub = {};
        
        // Private Methods
        function queryMsigdb(genelist) {
            var k,
                url;

            url = "http://www.broadinstitute.org/gsea/msigdb/annotate.jsp?geneList=";
            for (k = 0; k < genelist.length; k += 1) {
                url += genelist[k];
                url += ",";
            }
            window.open(url);
        } // END queryMsigdb

        function queryDavid(genelist) {
            var k,
                url;
            // currently assume that the ids are gene symbols, need change to the real encoding later
            url = "http://david.abcc.ncifcrf.gov/api.jsp?type=OFFICIAL_GENE_SYMBOL&ids=";
            for (k = 0; k < genelist.length; k += 1) {
                url += genelist[k];
                url += ",";
            }
            // hard code the tool as summary
            url += "&tool=summary";
            window.open(url);
        } // END queryDavid

        function queryGenemania(genelist) {
            var k,
                url;

            // currently assume that teh organism is human (NCBI taxonomy ID 9606)
            url = "http://genemania.org/link?o=9606&g=";
            for (k = 0; k < genelist.length; k += 1) {
                url += genelist[k];
                url += "|";
            }
            window.open(url);
        } // END queryGenemania

        // Public Methods
        pub.activate = function (genelist) {
            if (genelist.length === 0) {
                d3.select(".msigdbAnnotation").classed("disabled", true);
                d3.select(".davidAnnotation").classed("disabled", true);
                d3.select(".genemaniaAnnotation").classed("disabled", true);
            } else {
                d3.select(".msigdbAnnotation")
                    .classed("disabled", false)
                    .on("click", function () {
                        queryMsigdb(genelist);
                    });
                d3.select(".davidAnnotation")
                    .classed("disabled", false)
                    .on("click", function () {
                        queryDavid(genelist);
                    });

                d3.select(".genemaniaAnnotation")
                    .classed("disabled", false)
                    .on("click", function () {
                        queryGenemania(genelist);
                    });
            }
        }; // end activateAnnot
        
        return pub;
    }(window, jQuery)); // END annotate

    // Functions for brush box
    brushTools = (function (window, $, undef) {
        var pub = {};
        
        // Private Methods
        function resetClasses(event) {
            svgObj.selectAll("circle").classed("selectedNode", false);
            svgObj.selectAll("circle").classed("geneset", function (d) {
                if (d.x === 0 && d.y === 0) {
                    return false;
                } else {
                    return true;
                }
            });
            svgObj.select("#edgeGroup").selectAll("path").classed("selectedEdge", false);
        } // END resetClasses
        
        // Public Methods
        pub.move = function (event) {
            resetClasses();

            var e = brush.extent(),
                points = svgObj.selectAll(".geneset");

            points.classed("selectedNode", function (d) {
                return e[0][0] < xScale(d.x) && xScale(d.x) < e[1][0]
                    && e[0][1] < (h - yScale(d.y)) && (h - yScale(d.y)) < e[1][1];
            });
            //points.each(function(d) { d.selected = false; });
        }; // END move

        // Executes when brush selector stops moving
        pub.stop = function (event) {
            metadata.display();
        }; // END stop        
        
        return pub;
    }(window, jQuery)); // END brushTools

    // functions for plotting Constellation Map from input ODF files
    plotConMap = (function (window, $, undef) {
        var pub = {};
        
        // Private Methods
        // Function for parsing nodes.odf
        function parseODF(lines) {
            var numHeaderLines = parseInt(lines[1].split('=')[1], 10),
                metadata = {}, // initialize metadata object
                i,
                singleData,
                arrayData,
                dataitems,
                dataLines,
                data,
                j,
                dataRow,
                k,
                colName,
                colType,
                outObject;
            // get metadata
            for (i = 2; i < 2 + numHeaderLines; i += 1) {
                // check if single item or array
                singleData = lines[i].split('=');
                arrayData = lines[i].split(':');
                if (singleData.length === 2) {
                    metadata[singleData[0]] = singleData[1];
                }
                if (arrayData.length === 2) {
                    dataitems = arrayData[1].split('\t');
                    metadata[arrayData[0]] = dataitems;
                }
            }

            dataLines = parseInt(metadata.DataLines, 10);

            data = []; // initalize data (array of object)
            //data[0] = { "Phenotype":"" }; 

            // get data
            for (j = 0; j < dataLines; j += 1) {
                dataRow = lines[j + 2 + numHeaderLines].split('\t');
                data[j] = {};

                for (k = 0; k < dataRow.length; k += 1) {
                    colName = metadata.COLUMN_NAMES[k];
                    colType = metadata.COLUMN_TYPES[k];
                    if (colType === "int") {
                        data[j][colName] = parseInt(dataRow[k], 10);
                    } else if (colType === "double" || colType === "float" || colType === "long") {
                        data[j][colName] = parseFloat(dataRow[k]);
                    } else if (colType === "boolean") {
                        if (dataRow[k] === "true") {
                            data[j][colName] = true;
                        } else if (dataRow[k] === "false") {
                            data[j][colName] = false;
                        }
                    } else {
                        data[j][colName] = dataRow[k];
                    }
                }
            }

            outObject = {"metadata": metadata,
                             "data": data};
            return outObject;
        } // END parseODF

        // Plot concentric circles
        function plotArcs(event) {
            var arc1,
                arc2,
                arc3;

            arc1 = d3.svg.arc()
                .innerRadius(50)
                .outerRadius(51)
                .startAngle(0) //converting from degs to radians
                .endAngle(360 * (Math.PI / 180)); //just radians

            arc2 = d3.svg.arc()
                .innerRadius(150)
                .outerRadius(151)
                .startAngle(0) //converting from degs to radians
                .endAngle(360 * (Math.PI / 180)); //just radians
            arc3 = d3.svg.arc()
                .innerRadius(250)
                .outerRadius(251)
                .startAngle(0) //converting from degs to radians
                .endAngle(360 * (Math.PI / 180)); //just radians

            svgObj.append("g").attr("id", "arcs");

            svgObj.select("#arcs").append("path")
                .attr("d", arc1)
                .attr("transform", "translate(" + xScale(0) + "," + (h - yScale(0)) + ")")
                .attr("class", "arc");
            svgObj.select("#arcs").append("path")
                .attr("d", arc2)
                .attr("transform", "translate(" + xScale(0) + "," + (h - yScale(0)) + ")")
                .attr("class", "arc");
            svgObj.select("#arcs").append("path")
                .attr("d", arc3)
                .attr("transform", "translate(" + xScale(0) + "," + (h - yScale(0)) + ")")
                .attr("class", "arc");
        } // END plotArcs

        // Plot nodes
        function plotNodes(nodes, nodesMeta) {
            var radius = 8,
                selectedRadius = 10,   //the radius when mouse over
                align = 10,
            //var phenColor = "#847985";
            //var nodeColor = "#0a8166";
            // var legendWidth = 100;
                ext,
                arc1,
                arc2,
                arc3,
                nodelen = nodes.length,
                j,
                phenNode;

            for (j = 0; j < nodelen; j += 1) {
                nodes[j].MemberGenes = nodesMeta[nodes[j]["Gene.Set.Name"]];
            }

            phenNode = { "Phenotype": nodesMeta["Target Class"] };
            phenNode.direction = nodesMeta.Direction;
            phenNode = [phenNode];


            // plot phenotype node
            svgObj.append("polygon")
                .attr("points", function (d) {
                    return plotMath.interpolateCross(radius);
                })
                .attr("class", "phen")
                .data(phenNode);
            svgObj.select("polygon")
                .on("mouseover", function (d) {
                    var xOffset = parseInt($("svg.canvas").css("margin-left"), 10),
                        yOffset = document.getElementById("svgContainer").getBoundingClientRect().top,
                        xPosition = xScale(0) + align + xOffset,
                        yPosition = h - yScale(0) + align + yOffset;

                    d3.select("#phenTooltip")
                        .style("left", xPosition + "px")
                        .style("top", yPosition + "px")
                        .select("#phenotype")
                        .text(d.Phenotype);

                    d3.select("#phenTooltip")
                        //.style("left", xPosition + "px")
                        //.style("top", yPosition + "px")
                        .select("#direction")
                        .text(d.direction);

                    d3.select("#phenTooltip").classed("hidden", false);
                })
                .on("mouseout", function (d) {
                    d3.select("#phenTooltip").select("svg").remove();
                    d3.select("#phenTooltip").classed("hidden", true);
                });

            // plot nodes
            svgObj.selectAll("circle")
                .data(nodes)
                .enter()
                .append("circle")
                .attr("cx", function (d) {
                    return xScale(d.x);
                })
                .attr("cy", function (d) {
                    return h - yScale(d.y);
                })
                .attr("r", radius)
                .attr("class", "geneset")
                .on("mouseover", function (d, i) {
                    //var xOffset = (window.innerWidth - w) / 2,
                    //    yOffset = (window.innerHeight - h) / 2,
                    var xOffset = parseInt($("svg.canvas").css("margin-left"), 10),
                        yOffset = document.getElementById("svgContainer").getBoundingClientRect().top,
                        xPosition = parseFloat(d3.select(this).attr("cx")) + align + xOffset,
                        yPosition = parseFloat(d3.select(this).attr("cy")) + align + yOffset;

                    d3.select(this).attr("r", selectedRadius);

                    d3.select("#tooltip")
                        .style("left", xPosition + "px")
                        .style("top", yPosition + "px")
                        .select("#name")
                        .text(d["Gene.Set.Name"]);

                    d3.select("#tooltip")
                        //.style("left", xPosition + "px")
                        //.style("top", yPosition + "px")
                        .select("#size")
                        .text(d["gene.set.size"]);

                    d3.select("#tooltip")
                        //.style("left", xPosition + "px")
                        //.style("top", yPosition + "px")
                        .select("#url")
                        .text("Placeholder");

                    d3.select("#tooltip").classed("hidden", false);
                })
                .on("mouseout", function (d) {
                    d3.select(this).attr("r", radius);
                    d3.select("#tooltip").select("svg").remove();
                    d3.select("#tooltip").classed("hidden", true);
                })
                .on("click", function (d) {
                    var tableOneObj,
                        tableTwoObj,
                        GeneSetName,
                        k,
                        clickedNode,
                        selectedPts,
                        dataObj;

                    // Remove brush, edge selection
                    d3.selectAll(".brush").call(brush.clear());
                    svgObj.select("#edgeGroup").selectAll("path").classed("selectedEdge", false);

                    if (d3.event.shiftKey) {
                        // Highlight node
                        clickedNode = d3.select(this);
                        clickedNode.classed("selectedNode", true);

                        metadata.display();

                    } else {
                        /*// Unhide tables, hide default text
                        unhideInfo();
                        d3.selectAll(".miniForm").classed("hidden", true);

                        // Remove previous metadata in panels
                        removeData();*/

                        // Highlight node
                        svgObj.selectAll("circle").classed("selectedNode", false);
                        clickedNode = d3.select(this);
                        clickedNode.classed("selectedNode", true);

                        metadata.display();
                    } // if (d3.event.shiftKey)
                }); // .on("click")

        } // END plotNodes

        // Load nodes
        function nodeLoaded(event) {
            var lines = event.split('\n'),
                odfObj = parseODF(lines);

            plotNodes(odfObj.data, odfObj.metadata);
        } // END nodeLoaded

        // Plot edges
        function plotEdges(edges, edgesMeta) {
            var dupEdges,
                ext,
                edgeColor = "#778BAD",
                selectedEdgeColor = "#B03B3B",
                edgeBorderColor = svgObj.select("#backgroundRect").style("fill"),
                jmin,
                jmax,
                j,
                gsNames,
                gs1,
                gs2,
                r = 8,
                curvature = 3;

            // Set scales
            ext = parseFloat(edgesMeta["Max Abs Extent"]);
            plotMath.setScales(ext);

            // Plot arc ruler
            plotArcs();

            // Find the thickness factor
            jmin = d3.min(edges, function (d) {
                return d.Jaccard;
            });
            jmax = d3.max(edges, function (d) {
                return d.Jaccard;
            });

            // Add gene set names and common member genes
            for (j = 0; j < edges.length; j += 1) {
                gsNames = edgesMeta["Gene Set Names"];
                gs1 = gsNames[edges[j].Index1 - 1];
                gs2 = gsNames[edges[j].Index2 - 1];
                edges[j].gs1 = gs1;
                edges[j].gs2 = gs2;

                edges[j].gs1Members = edgesMeta[gs1];
                edges[j].gs2Members = edgesMeta[gs2];
                edges[j].gsIntersect = setMath.intersect(edges[j].gs1Members.sort(), edges[j].gs2Members.sort());
                edges[j].gsUnion = setMath.union(edges[j].gs1Members.sort(), edges[j].gs2Members.sort());

                edges[j].gs1Unique = setMath.unique(edges[j].gs1Members, edges[j].gs2Members);
                edges[j].gs2Unique = setMath.unique(edges[j].gs2Members, edges[j].gs1Members);
            }

            svgObj.append("g").attr("id", "edgeGroup");

            svgObj.select("#edgeGroup").selectAll("path")
                .data(edges)
                .enter()
                .append("path")
                .attr("d", function (d) {
                    var factor = plotMath.jaccard2Width(d.Jaccard, jmax, jmin),
                        ptA = {x: xScale(d.x1),
                               y: h - yScale(d.y1)},
                        ptB = {x: xScale(d.x2),
                               y: h - yScale(d.y2)},
                        theta = Math.atan(factor / Math.sqrt(r * r - factor * factor));

                    return plotMath.calcEdgePath(ptA, ptB, r, theta, factor / curvature);
                })
                .attr("fill", edgeColor)
                .on("mouseover", function (d) {
                    var xPosition = parseInt($("svg.canvas").css("margin-left"), 10) + w,
                        yPosition = document.getElementById("svgContainer").getBoundingClientRect().top,
                        genelistObj = d3.select("#genelists"),
                        k,
                        kmax;

        //            d3.select(this).attr("fill", selectedEdgeColor);
                    d3.select(this).classed("selectedEdge", true);

                    genelistObj.style("left", xPosition + "px")
                        .style("top", yPosition + "px")
                        .select("#name1")
                        .text(d.gs1);

                    genelistObj.select("#name2")
                        .text(d.gs2);

                    genelistObj.select("#edgeGenes")
                        .selectAll("li")
                        .remove();
                    if (d.gsIntersect.length < 15) {
                        kmax = d.gsIntersect.length;
                    } else {
                        kmax = 15;
                    }
                    for (k = 0; k < kmax; k += 1) {
                        genelistObj.select("#edgeGenes")
                            .append("li")
                            .text(d.gsIntersect[k]);
                    }
                    genelistObj.select("#edgeGenes")
                            .append("li")
                            .text("...");

                    d3.select("#genelists").classed("hidden", false);
                })
                .on("mouseout", function (d) {
        //            d3.select(this).attr("fill", edgeColor);
                    d3.select(this).classed("selectedEdge", false);
                    d3.select("#genelists").classed("hidden", true);
                })
                .on("click", function (d) {
                    var tableOneObj,
                        tableTwoObj,
                        tableThreeObj,
                        tableRowObj,
                        clickedEdge,
                        GeneSetNames,
                        numGenes,
                        xcoord,
                        ycoord,
                        k,
                        dataObj,
                        points;

                    // Remove brush
                    d3.selectAll(".brush").call(brush.clear());

                    // Highlight edge
                    svgObj.select("#edgeGroup").selectAll("path").classed("selectedEdge", false);
                    svgObj.selectAll("circle").classed("selectedNode", false);
                    clickedEdge = d3.select(this);
                    clickedEdge.classed("selectedEdge", true);

                    dataObj = d;

                    // Highlight connected nodes
                    points = svgObj.selectAll(".geneset");
                    points.classed("selectedNode", function (d) {
                        return (d["Gene.Set.Name"] === dataObj.gs1 || d["Gene.Set.Name"] === dataObj.gs2);
                    });

                    metadata.display();
                });
        } // END plotEdges

        // Load edges
        function edgeLoaded(event) {
            //alert("File Loaded Successfully");
            var lines = event.split('\n'),
                odfObj = parseODF(lines);
            plotEdges(odfObj.data, odfObj.metadata);
        } // END edgeLoaded

        // Public Methods
        // Function for GETting data and initializing plot
        pub.main = function (event) {
            // HTML GET both ODF files
            var nodeURL = "ConstellationMap.plot.data.nodes.odf",
                edgeURL = "ConstellationMap.plot.data.edges.odf";

            $.ajax({
                url: edgeURL,
                type: 'GET',
                dataType: "text",
                success: function (data, status) {
                    console.log(status + ": successfully loaded file " + edgeURL);
                    edgeLoaded(data);
                },
                error: function (data, status) {
                    alert(status + ": failed to load file " + edgeURL);
                }
            });
            $.ajax({
                url: nodeURL,
                type: 'GET',
                dataType: "text",
                success: function (data, status) {
                    console.log(status + ": successfully loaded file " + nodeURL);
                    nodeLoaded(data);
                },
                error: function (data, status) {
                    alert(status + ": failed to load file " + nodeURL);
                }
            });
        }; // END main
        
        return pub;
    }(window, jQuery)); // END plotConMap

    initialize = (function (window, $, undef) {
        var pub = {};
        
        // Private Methods
        // Turn on tooltips
        function tooltipsOn(event) {
            $(".text-tooltip").tooltip();
        } // END tooltipsOn

        // Create SVG preview and write download link
        function writeSVGLink(event) {
            d3.select("#exportSvg").on("click", function () {
                var html;

                html = d3.select("svg")
                    .attr("title", "ConstellationMapImage")
                    .attr("version", 1.1)
                    .attr("xmlns", "http://www.w3.org/2000/svg")
                    .node().parentNode.innerHTML;

                d3.select("#modalSvgBody").selectAll("img").remove(); // remove previous image
                d3.select("#modalSvgBody").append("img")
                    .attr("src", "data:image/svg+xml;base64," + window.btoa(html))
                    .attr("class", "img-rounded img-responsive");

                d3.select("#modalSvgFooter").select("a").remove(); // remove previous link
                d3.select("#modalSvgFooter").append("a")
                    .attr("href-lang", "image/svg+xml")
                    .attr("href", "data:image/svg+xml;base64," + window.btoa(html))
                    .attr("download", "download.svg");
                d3.select("#modalSvgFooter").select("a").append("button")
                    .attr("type", "button")
                    .attr("class", "btn btn-primary")
                    .text("Save");
            });
        } // END writeSVGLink

        // Public Methods
        pub.main = function () {
            // Functions to execute when document is ready
            brush = d3.svg.brush()
                .x(d3.scale.identity().domain([0, w]))
                .y(d3.scale.identity().domain([0, h]))
                .on("brush", brushTools.move)
                .on("brushend", brushTools.stop);

            svgObj = d3.select("svg")
                .attr("class", "canvas")
                .style("align", "center")
                .attr("width", w)
                .attr("height", h);
            svgObj.append("rect")
                .attr("id", "backgroundRect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", w)
                .attr("height", h);
            svgObj.append("g")
                .attr("class", "brush")
                .call(brush)
                .call(brush.event);

            plotConMap.main();
            tooltipsOn();
            writeSVGLink();
            metadata.fuzzFactorListen();
        };
        
        return pub;
    }(window, jQuery));
    
    return {init: initialize.main};
}(window, jQuery, d3)); // END globalWrapper

$(document).ready(function () {
    "use strict";
    globalWrapper.init();
});