!function(){
  var bP = {};
  var b = 20, bb = 200, height = 300, buffMargin = 8, minHeight = 0;
  var c1 = [-200, 40], c2 = [-75, 180], c3 = [-15, 260]; //Column positions of labels. DAVID: c1=label, c2=value, c3=percentage, [left, right]
  var colors = ["#3366CC", "#DC3912", "#FF9900", "#109618", "#990099", "#0099C6"];
  var json;

  bP.partData = function (data, p, jsonData) {
    json = jsonData;
		var sData={};
		
		sData.keys=[
			d3.set(data.map(function(d){ return d[0];})).values().sort(function(a,b){ return ( a<b? -1 : a>b ? 1 : 0);}),
			d3.set(data.map(function(d){ return d[1];})).values().sort(function(a,b){ return ( a<b? -1 : a>b ? 1 : 0);})		
		];
		
		sData.data = [	sData.keys[0].map( function(d){ return sData.keys[1].map( function(v){ return 0; }); }),
						sData.keys[1].map( function(d){ return sData.keys[0].map( function(v){ return 0; }); }) 
		];
		
		data.forEach(function(d){ 
			sData.data[0][sData.keys[0].indexOf(d[0])][sData.keys[1].indexOf(d[1])]=d[p];
			sData.data[1][sData.keys[1].indexOf(d[1])][sData.keys[0].indexOf(d[0])]=d[p]; 
		});
		
		return sData;
	}
	
	function visualize(data){
		var vis ={};
		function calculatePosition(k, a, s, e, b, m){
			var total=d3.sum(a);
			var sum=0, neededHeight=0, leftoverHeight= e-s-2*b*a.length;
			var ret =[];
			
			a.forEach(
				function(d){
					var v={};
					v.percent = (total == 0 ? 0 : d/total); 
					v.value=d;
					v.height=Math.max(v.percent*(e-s-2*b*a.length), m);
					(v.height==m ? leftoverHeight-=m : neededHeight+=v.height );
					ret.push(v);
				}
			);
			
			var scaleFact=leftoverHeight/Math.max(neededHeight,1), sum=0,pb=b,pm=m;
			
			ret.forEach(
				function(d,i){
          if(k[i] == ""){ //DAVID:This is added so that when it detect a block with no label, it give a buffMargin and minHeight 0.
            b = 0;
            m = 0;
          }else{
            b = pb;
            m = pm;
          }
					d.height=(d.height==m? m : d.height*scaleFact);
					d.middle=sum+b+d.height/2;
					d.y=s + d.middle - d.percent*(e-s-2*b*a.length)/2;
					d.h= d.percent*(e-s-2*b*a.length);
					d.percent = (total == 0 ? 0 : d.value/total);
					sum+=2*b+d.height;
				}
			);
			return ret;
		}

    vis.mainBars = [ 
			calculatePosition(
        data.keys[0].map(function(d){ return d;}), 
        data.data[0].map(function(d){ return d3.sum(d);}), 
        0, 
        height, 
        buffMargin, 
        minHeight
      ),
			calculatePosition(
        data.keys[1].map(function(d){ return d;}), 
        data.data[1].map(function(d){ return d3.sum(d);}), 
        0, 
        height, 
        buffMargin, 
        minHeight
      )
		];
    
		vis.subBars = [[],[]];
		vis.mainBars.forEach(function(pos,p){
			pos.forEach(function(bar, i){
				calculatePosition(data.keys[p][i], data.data[p][i], bar.y, bar.y+bar.h, 0, 0).forEach(function(sBar,j){ 
					sBar.key1=(p==0 ? i : j); 
					sBar.key2=(p==0 ? j : i); 
					vis.subBars[p].push(sBar); 
				});
			});
		});
		vis.subBars.forEach(function(sBar){
			sBar.sort(function(a,b){ 
				return (a.key1 < b.key1 ? -1 : a.key1 > b.key1 ? 
						1 : a.key2 < b.key2 ? -1 : a.key2 > b.key2 ? 1: 0 )});
		});
		
		vis.edges = vis.subBars[0].map(function(p,i){
			return {
				key1: p.key1,
				key2: p.key2,
				y1:p.y,
				y2:vis.subBars[1][i].y,
				h1:p.h,
				h2:vis.subBars[1][i].h
			};
		});
		vis.keys=data.keys;
		return vis;
	}
	
	function arcTween(a) {
		var i = d3.interpolate(this._current, a);
		this._current = i(0);
		return function(t) {
			return edgePolygon(i(t));
		};
	}
	
	function drawPart(data, id, p){
		d3.select("#"+id).append("g").attr("class","part"+p)
			.attr("transform","translate("+( p*(bb+b))+",0)");
		d3.select("#"+id).select(".part"+p).append("g").attr("class","subbars");
		d3.select("#"+id).select(".part"+p).append("g").attr("class","mainbars");
		
		var mainbar = d3.select("#"+id).select(".part"+p).select(".mainbars")
			.selectAll(".mainbar").data(data.mainBars[p])
			.enter().append("g").attr("class","mainbar");

		mainbar.append("rect").attr("class","mainrect")
			.attr("x", 0).attr("y",function(d){ return d.middle-d.height/2; })
			.attr("width",b).attr("height",function(d,i){ //DAVID: These are modified due to the request to display patient phenotype that doesn't match with any selected disorders.
        if(data.keys[p][i].length == 0)return 0; 
        else return d.height; 
      })
			.style("shape-rendering","auto")
			.style("fill-opacity",0).style("stroke-width","0.5")
			.style("stroke","black").style("stroke-opacity",0);
			
		mainbar.append("text").attr("class","barlabel")
			.attr("x", c1[p]).attr("y",function(d){ return d.middle+5;})
			.text(function(d,i){ 
        if(data.keys[p][i].length == 0)return ""; 
        else return data.keys[p][i];
      }).call(wrap,100)
			.attr("text-anchor","start" );
			
		mainbar.append("text").attr("class","barvalue")
			.attr("x", c2[p]).attr("y",function(d){ return d.middle+5;})
			.text(function(d,i){ 
        if(data.keys[p][i].length == 0)return ""; 
        return d.value;
      })
			.attr("text-anchor","end");
		
    if(p==0){    
      mainbar.append("text").attr("class","barpercent")
        .attr("x", c3[p]).attr("y",function(d){ return d.middle+5;})
        .text(function(d,i){
          var selectedDisorder = data.keys[p][i];
          var returnedPercentage;
          if(selectedDisorder.length == 0)return ""; 
          else {
            json
              .disorders
              .forEach(function(disorder){
                if(selectedDisorder == disorder.label){
                  returnedPercentage = Math.round(100*(d.value/disorder.phenotypes.length)) ;
                }
              })

            return "( "+returnedPercentage+"%)" ;
          }
        })
        .attr("text-anchor","end").style("fill","grey");
		}	
      
		d3.select("#"+id).select(".part"+p).select(".subbars")
			.selectAll(".subbar").data(data.subBars[p]).enter()
			.append("rect").attr("class","subbar")
			.attr("x", 0).attr("y",function(d){ return d.y})
			.attr("width",b).attr("height",function(d){ return d.h})
			.style("fill",function(d){ return colors[d.key1];});
	}
	
	function drawEdges(data, id){
		d3.select("#"+id).append("g").attr("class","edges").attr("transform","translate("+ b+",0)");

		d3.select("#"+id).select(".edges").selectAll(".edge")
			.data(data.edges).enter().append("polygon").attr("class","edge")
			.attr("points", edgePolygon).style("fill",function(d){ return colors[d.key1];})
			.style("opacity",0.5).each(function(d) { this._current = d; });	
	}	
	
	function drawHeader(header, id){
		d3.select("body").append("h2").attr("class","header").text(header.heading);

		[0,1].forEach(function(d){
			var h = d3.select("#"+id).select(".part"+d).append("g").attr("class","header"),
          side = "left";
      
      if(d==1)side = "right";
			
			h.append("text").text(header[side+"1"]).attr("x", (c1[d]-5))
				.attr("y", -5).style("fill","grey");
			
			h.append("text").text(header[side+"2"]).attr("x", (c2[d]-10))
				.attr("y", -5).style("fill","grey");
			
			h.append("line").attr("x1",c1[d]-10).attr("y1", -2)
				.attr("x2",c3[d]+10).attr("y2", -2).style("stroke","black")
				.style("stroke-width","1").style("shape-rendering","crispEdges");
		});
	}
	
	function edgePolygon(d){
		return [0, d.y1, bb, d.y2, bb, d.y2+d.h2, 0, d.y1+d.h1].join(" ");
	}	
	
  function wrap(text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text[0][0].textContent.split(/\s+/).reverse(),
            word,
            line = [],
            lineHeight = 1.2, // ems
            x = text.attr("x"), //DAVID: Y is not defined for the tspan to make it move with the text node.
            dy = 0,
            tspan = text.text(null)
                        .append("tspan")
                        .attr("x", x)
                        .attr("dy", dy + "em");
        
        var count = 0; //DAVID: This variable is used to ensure if the first word doesn't jump to the next line if is larger than the text width.
        
        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan")
                            .attr("x", x)
                            .attr("dy", lineHeight + dy + "em")
                            .text(word);
            }
            count++;
        }
    });
  }
  
	function transitionPart(data, id, p){
		var mainbar = d3.select("#"+id).select(".part"+p).select(".mainbars")
			.selectAll(".mainbar").data(data.mainBars[p]);
		
		mainbar.select(".mainrect").transition().duration(500)
			.attr("y",function(d){ return d.middle-d.height/2;})
			.attr("height",function(d){ return d.height;});
			
		mainbar.select(".barlabel").transition().duration(500)
			.attr("y",function(d){ return d.middle+5;});

		mainbar.select(".barvalue").transition().duration(500)
			.attr("y",function(d){ return d.middle+5;})
      .text(function(d,i){ 
        if(data.keys[p][i].length == 0)return ""; 
        else return d.value ;
      });
			
		mainbar.select(".barpercent").transition().duration(500)
			.attr("y",function(d){ return d.middle+5;});

			
		d3.select("#"+id).select(".part"+p).select(".subbars")
			.selectAll(".subbar").data(data.subBars[p])
			.transition().duration(500)
			.attr("y",function(d){ return d.y}).attr("height",function(d){ return d.h});
	}
	
	function transitionEdges(data, id){
		d3.select("#"+id).append("g").attr("class","edges")
			.attr("transform","translate("+ b+",0)");

		d3.select("#"+id).select(".edges").selectAll(".edge").data(data.edges)
			.transition().duration(500)
			.attrTween("points", arcTween)
			.style("opacity",function(d){ return (d.h1 ==0 || d.h2 == 0 ? 0 : 0.5);});	
	}
	
	function transition(data, id){
		transitionPart(data, id, 0);
		transitionPart(data, id, 1);
		transitionEdges(data, id);
	}
  
  
  function infoPhenotype(d,i){ 
    var dd = d[0].data;
        pheno = dd.keys[1][i],
        related = dd.data[1][i],
        h = "",
        moreInfo = {};
        

    json
      .sourcePatient
      .phenotypes
      .forEach(function(p){
        if(pheno == p.label){
          moreInfo = p;
        }
      })
    ;
    
    h += '<h3>'+pheno+'</h3>';
    h += '<hr>';
    h += 'Abnormaly types:';
    h += '<ul>';
    
    moreInfo.root_terms.forEach(function(t){
      h += '<li>'+t+'</li>';
    });
    
    h += '</ul>';
    
    if(moreInfo.similar_to){
      h += 'Similar to:';
      h += '<ul>';
      
      moreInfo.similar_to.forEach(function(st){
        h += '<li>'+st.label+' ('+st.similarity_value*100+'%)</li>';
      });
 
      h += '</ul>';
    }
    
    h += 'Related disorders:';
    h += '<ul>';
    
    related.forEach(function(dIndex,j){
      if(dIndex == 1)h += '<li>'+dd.keys[0][j]+'</li>';
    });
    
    h += '</ul>';
    
    return h;
  }
	
  function infoDisorder(d,i){
    var dd = d[0].data;
    patientPheno = dd.keys[1],
    disorder = dd.keys[0][i],
    relatedPheno = dd.data[0][i],
    h = "",
    disorderInfo = {};
     
    json
      .disorders
      .forEach(function(dis){
        if(dd.keys[0][i] == dis.label){
          disorderInfo = dis;
        }
      })
    ;
    
    h += '<h3>'+disorder+'</h3>';
    h += '<hr>';
    h += 'Phenotypes related to '+disorder+':';
    h += '<ul>';
    
    disorderInfo
      .phenotypes
      .forEach(function(p){
        var temp = "";
        
        relatedPheno.forEach(function(rp,ri){
          
          if(rp == 1 && p.label == patientPheno[ri]){
            temp = '<li class="match">'+p.label+'</li>';
          }
          
          json
            .sourcePatient
            .phenotypes
            .forEach(function(sp){
              if(sp.similar_to){
                sp.similar_to.forEach(function(st){
                  if(p.label == st.label)
                  temp = '<li class="match">'+p.label+' - similar with '+sp.label+' by '+st.similarity_value*100+'%</li>';
                });
              }
            })
          ; 
         
        });
        
        h += temp || '<li>'+p.label+'</li>';
      });
    
    h += '</ul>';
    
    return h;
  }
  
	bP.draw = function(data, svg){
		data.forEach(function(biP,s){
			svg.append("g")
				.attr("id", biP.id)
				.attr("transform","translate("+ (550*s)+",0)");
				
			var visData = visualize(biP.data);
			drawPart(visData, biP.id, 0);
			drawPart(visData, biP.id, 1); 
			drawEdges(visData, biP.id);
			drawHeader(biP.header, biP.id);
      
            
      var div = d3.select("body").append("div")   
        .attr("class", "biPartitePopuptip")            
        .style("display", "none");

      var info;  

			[0,1].forEach(function(p){
				d3.select("#"+biP.id)
					.select(".part"+p)
					.select(".mainbars")
					.selectAll(".mainbar")
					.on("mouseover",function(d, i){
            if(p == 1)info = infoPhenotype(data,i);
            else info = infoDisorder(data,i);
          
            div.style("display","block");      
            div.html(info)  
               .style("left", (d3.event.pageX - (1-p)*(parseFloat(div.style("width"))+20) + ((-1+(p*2))*30) + "px"))  //DAVID:This determines the positioning of the info popup offset from the cursor.    
               .style("top", (d3.event.pageY) + "px");  
                
            return bP.selectSegment(data, p, i); 
          })
          .on("mousemove",function(d, i){
            div.style("left", (d3.event.pageX - (1-p)*(parseFloat(div.style("width"))+20) + ((-1+(p*2))*30) + "px"))     
               .style("top", (d3.event.pageY) + "px");  
          })
					.on("mouseout",function(d, i){ 
            div.style("display","none");
              
            return bP.deSelectSegment(data, p, i); 
          });	
			});
		});	
	}
	
	bP.selectSegment = function(data, m, s){
		data.forEach(function(k){
			var newdata =  {keys:[], data:[]};	
				
			newdata.keys = k.data.keys.map( function(d){ return d;});
			
			newdata.data[m] = k.data.data[m].map( function(d){ return d;});
			
			newdata.data[1-m] = k.data.data[1-m]
				.map( function(v){ return v.map(function(d, i){ return (s==i ? d : 0);}); });
			
			transition(visualize(newdata), k.id);
				
			var selectedBar = d3.select("#"+k.id).select(".part"+m).select(".mainbars")
				.selectAll(".mainbar").filter(function(d,i){ return (i==s);});
			
			selectedBar.select(".mainrect").style("stroke-opacity",1);
			selectedBar.select(".mainrect").style("stroke-width",3);			
			selectedBar.select(".barlabel").style('font-weight','bold');
			selectedBar.select(".barvalue").style('font-weight','bold');
			selectedBar.select(".barpercent").style('font-weight','bold');
		});
	}	
	
	bP.deSelectSegment = function(data, m, s){
		data.forEach(function(k){
			transition(visualize(k.data), k.id);
			
			var selectedBar = d3.select("#"+k.id).select(".part"+m).select(".mainbars")
				.selectAll(".mainbar").filter(function(d,i){ return (i==s);});
			
			selectedBar.select(".mainrect").style("stroke-opacity",0);			
			selectedBar.select(".barlabel").style('font-weight','normal');
			selectedBar.select(".barvalue").style('font-weight','normal');
			selectedBar.select(".barpercent").style('font-weight','normal');
		});		
	}
	
	this.bP = bP;
}();