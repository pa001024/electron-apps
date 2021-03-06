'use strict';
Array.prototype.remove = function(val) {
	var index = this.indexOf(val);
	if (index > -1)
		this.splice(index, 1);
};
Array.prototype.removeAt = function(index) {
	if (index > -1)
		this.splice(index, 1);
};
// init

var xyplots = [];
var xyp_ = [];
var updateZ, invZ;
var PointsHelper = {
	canvas: null,
	len: 0,
	stdlen: 0,
	points: [],
	objs: [],
	selected: 0,
	add: function(name,x) {
		name = name || "测量点" + (this.objs.length+1);
		var canvas = this.canvas;
		var W = canvas.width, H = canvas.height, MX = W / 2, MY = H / 2;
		if (this.selected > 0) {
			var point = this.objs[this.selected-1];
			point.x = 20+(W-40)/10 + x*((W-40)/10/this.stdlen);
			point.children[0].text = x+"m";
			return;
		}
		var point = canvas.display.polygon({
			x: 20+(W-40)/10 + x*((W-40)/10/this.stdlen),
			y: MY-25,
			sides: 3,
			radius: 15,
			rotation: 90,
			fill: "#0aa"
		}).add().addChild(canvas.display.text({
			x: -10,
			y: 0,
			rotation: 270,
			align: "center",
			lineHeight: 1.2,
			origin: { x: "center", y: "bottom" },
			font: "bold 12px sans-serif",
			text: x+"m",
			fill: "#0aa"
		})).addChild(canvas.display.text({
			x: -27,
			y: 0,
			rotation: 270,
			align: "center",
			lineHeight: 1.2,
			origin: { x: "center", y: "bottom" },
			font: "bold 12px sans-serif",
			text: name,
			fill: "#0aa"
		}));
		var _this = this;
		point.bind("click tap",function() {
			_this.unsel();
			var id = _this.objs.indexOf(this) + 1;
			_this.selected = id;
			this.children[1].fill = this.children[0].fill = this.fill = "#3498DB";
			$("#btn-unselpoint,#btn-removepoint").removeClass("disabled");
			$("#point-distance").val(_this.points[id-1].x);
			$("#btn-newpoint").html('<span class="fui-check"></span> 应用');
		});
		this.objs.push(point);
		this.points.push({name: name, x: x});
	},
	remove: function(id) {
		if (this.selected) id = id || this.selected - 1;
		this.points.removeAt(id);
		this.objs[id].remove();
		this.objs.removeAt(id);
		$("#btn-unselpoint,#btn-removepoint").addClass("disabled");
		this.selected = 0;
	},
	unsel: function(id) {
		this.selected = 0;
		this.objs.forEach(function(v) {
			v.children[1].fill = v.children[0].fill = v.fill = "#0aa";
		});
		$("#btn-unselpoint,#btn-removepoint").addClass("disabled");
		$("#btn-newpoint").html('<span class="fui-plus"></span> 新建');
	},
	redraw: function() {
		var points = this.points.map(v => v);
		var _this  = this;
		this.unsel();
		while (this.objs.length) this.remove(0);
		points.map(a => _this.add(a.name, a.x));
	},
	rules: [],
	end: null,
	setLength: function(len) {
		this.len = len;
		this.stdlen = Math.ceil(len/8);
		var canvas = this.canvas;
		var W = canvas.width, H = canvas.height, MX = W / 2, MY = H / 2;
		// 以8向上取整
		// 标尺
		if (this.rules.length) this.rules.forEach(function(v){ v.remove(); });
		if (this.end) { this.end.remove(); }
		this.rules = [];
		for (var i = 1; i < 10; i++) {
			var line = canvas.display.line({
				start: { x: 20 + (i*(W-40)/10), y: MY },
				end:   { x: 20 + (i*(W-40)/10), y: MY+40 },
				opacity: 0.5,
				stroke: "1px #0aa"
			}).add().addChild(canvas.display.text({
				x: 0,
				y: 20,
				origin: { x: "center", y: "top" },
				font: "bold 12px sans-serif",
				text: i==1 ? "主机" : (i-1)*this.stdlen+"m",
				fill: "#0aa"
			}));
			this.rules.push(line);
		}
		this.end = canvas.display.line({
			start: { x: 20+(W-40)/10 + len*((W-40)/10/this.stdlen), y: MY+10 },
			end:   { x: 20+(W-40)/10 + len*((W-40)/10/this.stdlen), y: MY+50 },
			opacity: 0.5,
			stroke: "1px #a00"
		}).add().addChild(canvas.display.text({
			x: 0,
			y: 20,
			origin: { x: "center", y: "top" },
			font: "bold 12px sans-serif",
			text: len+"m",
			fill: "#a00"
		})).addChild(canvas.display.text({
			x: 0,
			y: 40,
			origin: { x: "center", y: "top" },
			font: "bold 12px sans-serif",
			text: "轴端",
			fill: "#a00"
		}));
		this.redraw();
	}
};
function randx(a,b) {
	return a + Math.random()*(b-a);
}
// 数据
var DataHelper = {
	dataGroup: [],
	dataSize: 1000, // 数据大小
	sampleSize: 10, // 显示大小
	time: null,
	duration: 0,
	setGroupSize: function(v) {
		var g = this.dataGroup.length;
		for (var i = 0; i < Math.abs(g-v); i++) {
			this.dataGroup[v >= g ? "push":"shift"]([]);
		}
	},
	/// 随机数据生成算法
	nextData: function(theta, r){
		// theta: 当前的角度 r: 当前的偏移量 极坐标随机偏移
		var m = r + randx(-0.1,0.1) - Math.pow((r-2)/10,3);
		if (m>4) m = 4;
		if (m<0) m = 0;
		var n = randx(-0.8,0.8);
		theta += n;
		return [ ~~((m*Math.cos(theta/180*Math.PI))*10)/10,
				 ~~((m*Math.sin(theta/180*Math.PI))*10)/10, m];
	},
	theta: 0,
	next: function() {
		for (var i = 0; i < this.dataGroup.length; i++) {
			var last = this.get(i);
			var nextData = this.nextData(this.theta, last ? last[2] : 0);
			this.dataGroup[i].push(nextData);
			while (this.dataGroup[i].length > this.dataSize) this.dataGroup[i].shift();
		}
		if (++this.theta>360) this.theta = 0;
	},
	get: function(index) {
		return this.dataGroup[index][this.dataGroup[index].length-1];
	},
	getSample: function(index) {
		var res = [];
		for (var i = this.dataGroup[index].length >= this.sampleSize?
				0 : this.sampleSize - this.dataGroup[index].length; i < this.sampleSize; ++i) {
			res.push(this.dataGroup[index][this.dataGroup[index].length - this.sampleSize + i]);
		}
		return res;
	},
	createProcess: function(id, index) {
		var canvas = oCanvas.create({
			canvas: "#"+id,
			background: "#fafafa",
			fps: 10
		});

		var mx = canvas.width / 2, my = canvas.height / 2;
		var rules = [];
		for (var i = 1; i < 5; i++) {
			rules.push(canvas.display.ellipse({
				x: mx, y: my,
				radius: i*canvas.width/10,
				opacity: 0.5,
				stroke: "1px #3498DB"
			}).add());
		}
		// canvas.setLoop(function() {}).start();
		var sg = canvas.width/10;
		var _this = this;
		return { canvas: canvas,
			do: function(cl) {
				canvas.draw.redraw();
				var ctx = $("#"+id)[0].getContext("2d");
				var p0 = _this.dataGroup[index][0];
				if (!p0) return;
				ctx.lineWidth = 1;
				ctx.strokeStyle = '#9B59B6';
				ctx.lineCap = 'round';
				ctx.beginPath();
				ctx.moveTo(mx - p0[0]*sg, my - p0[1]*sg);
				for (var i = 1; i < _this.dataGroup[index].length; i++) {
					var p1 = _this.dataGroup[index][i];
					ctx.lineTo(mx - p1[0]*sg, my - p1[1]*sg);
				}
				ctx.stroke();
				ctx.closePath();
			},
		};
	},
	// 创建实时视图
	createPlot: function(id, index) {
		var canvas = oCanvas.create({
			canvas: "#"+id,
			background: "#fafafa",
			fps: 60
		});
		var mx = canvas.width / 2, my = canvas.height / 2;
		var rules = [];
		for (var i = 1; i < 5; i++) {
			rules.push(canvas.display.ellipse({
				x: mx, y: my,
				radius: i*canvas.width/10,
				opacity: 0.5,
				stroke: "1px #3498DB"
			}).add());
		}

		var tails = [];
		for (var i = 1; i < 10; i++) {
			tails.push(canvas.display.ellipse({
				x: mx, y: my,
				radius: canvas.width / (85-i*5),
				fill: "rgb(0,"+(100+i*10)+","+(100+i*10)+")",
				opacity: 0.05*i
			}).add());
		}

		var rt_radius = canvas.display.ellipse({
			x: mx, y: my,
			radius: 0,
			stroke: "2px #0aa"
		}).add();
		var centerLine = canvas.display.line({
			start: {x: mx,y: my},
			end: {x: mx,y: my},
			stroke: "1px #34495E",
			opacity: 0.5,
			cap: "round"
		}).add();
		var center = canvas.display.ellipse({
			x: canvas.width / 2, y: canvas.height / 2,
			radius: canvas.width / 40,
			fill: "#2ECC71",
			stroke: "1px #fff"
		}).add();
		var centerLineText = canvas.display.text({
			x: mx,y: my,
			origin: { x: "center", y: "center" },
			font: "normal 14px sans-serif",
			text: "",
			fill: "#0aa"
		}).add();
		var ccTimes = 0;
		canvas.setLoop(function(){}).start();
		var sg = canvas.width/10;
		return { canvas: canvas, centerLineText: centerLineText, do: function(a) {
				rt_radius.radius = a[2];
				if (ccTimes++ > 4) {
					ccTimes = 0;
					for (var i = 1; i < tails.length; i++) {
						tails[i-1].x = tails[i].x;
						tails[i-1].y = tails[i].y;
					}
					tails[tails.length-1].x = center.x;
					tails[tails.length-1].y = center.y;
				}
				center.x = a[0]*sg + mx;
				center.y = a[1]*sg + my;
				// console.log(center.x);
				centerLine.end = {x: center.x ,y: center.y};
				centerLineText.text = ~~(a[2]*10)/10+"mm";
				centerLineText.x = (center.x + mx)/2;
				centerLineText.y = (center.y + my)/2;
			},
		};
	},
	// 清除数据
	clear: function() {
		for (var i = 0; i < this.dataGroup.length; i++) {
			this.dataGroup[i] = [];
		}
	},
};
for (var i = 1; i <= 3; i++) {
	xyplots.push(DataHelper.createPlot("xy"+i));
	xyp_.push(DataHelper.createProcess("pxy"+i, i-1))
}
createZ();
createConfig();

// init data
PointsHelper.setLength(15);
PointsHelper.add("", 1.2);
PointsHelper.add("", 5.0);
PointsHelper.add("", 12.5);
DataHelper.setGroupSize(3);

// event
$("#btn-start").click(function() {
	var v = $(this).data("tg");
	$(this).text(v?"开始采样":"停止采样");
	$(this).switchClass(v?"btn-danger":"btn-primary",v?"btn-primary":"btn-danger");
	$(this).data("tg",!v);
	xyplots.forEach(function(i){
		i.canvas.timeline[v?"stop":"start"]();
	});
	if (v) clearInterval(invZ);
	else invZ = setInterval(function() {
		updateZ();
		DataHelper.next();
		xyplots.forEach(function(b, index) {
			b.do(DataHelper.get(index));
		});
		if(!$("#process-holder").hasClass("hideact")) {
			xyp_.forEach(function(b, index) {
				b.do(DataHelper.get(index));
			});
		}
	}, 1e3/60);
});

const dialog = require('electron').remote.dialog;
$("#btn-save").click(function() {
	dialog.showSaveDialog();
});

$("#btn-hidenum").click(function(){
	var v = $(this).data("tg");
	$(this).text(v?"隐藏数值":"显示数值");
	$(this).data("tg",!v);
	xyplots.forEach(function(that){
		that.centerLineText.opacity = v?1:0;
		that.canvas.draw.redraw();
	});
});

function toggleHide(id) {
	var elm = $("#"+id);
	if(elm.hasClass("hideact")) elm.show();
	setTimeout(function() { elm.toggleClass("hideact"); }, 0);
	setTimeout(function() { if (elm.hasClass("hideact")) elm.hide(); }, 500);
}

$("#btn-editpoints,#btn-editpoints-close").click(function() {
	toggleHide("config-holder");
});

$("#btn-process,#btn-process-close").click(function() {
	if($("#process-holder").hasClass("hideact")) {
		xyp_.forEach(function(b, index) {
			b.do(DataHelper.get(index));
		});
	}
	toggleHide("process-holder");
});

$("#btn-about").click(function() {
	location.reload();
});
$("#btn-newpoint").click(function() {
	if ($("#point-distance").val()) {
		PointsHelper.add("", $("#point-distance").val());
		$("#point-distance").val("");
		$("#point-distance").parent(".form-group").removeClass("has-error").addClass("has-success").delay(1e3).removeClass("has-success");
	} else {
		$("#point-distance").parent(".form-group").removeClass("has-success").addClass("has-error");
	}
});

// 取消选择点
$("#btn-unselpoint").click(function() {
	PointsHelper.unsel();
	$("#point-distance").val("");
});
// 删除点
$("#btn-removepoint").click(function() {
	PointsHelper.remove();
	$("#point-distance").val("");
});

// 设置长度
$("#btn-setlength").click(function() {
	if (+$("#point-length").val()) {
		PointsHelper.setLength(+$("#point-length").val());
		$("#point-length").val("");
		$("#point-length").parent(".form-group").removeClass("has-error").addClass("has-success").delay(1e3).removeClass("has-success");
	} else {
		$("#point-length").parent(".form-group").removeClass("has-success").addClass("has-error");
	}
});
var extfilters = [
	{ name: '工程文件', extensions: ['aprj'] },
	{ name: '所有文件', extensions: ['*'] }
];
$("#btn-filenew").click(function() {
	dialog.showSaveDialog({ filters: extfilters });
});
$("#btn-fileopen").click(function() {
	dialog.showOpenDialog({ filters: extfilters });
});
$("#btn-filesave").click(function() {
	dialog.showSaveDialog({ filters: extfilters });
});

// functions

// points-config
function createConfig(){
	var canvas = oCanvas.create({
		canvas: "#points-config",
		background: "#fafafa",
		fps: 60
	});
	var W = canvas.width, H = canvas.height, MX = W / 2, MY = H / 2;
	var line = canvas.display.line({
		start: { x: 20, y: MY },
		end: { x: W-20, y: MY },
		stroke: "20px #0aa",
		cap: "round"
	}).add();
	var zhuji = canvas.display.rectangle({
		x: -40 + (W-40)/10, y: MY-20,
		width: 60, height: 40,
		fill: "#0aa",
		cap: "round"
	}).add();
	PointsHelper.canvas = canvas;
	canvas.setLoop(function(){}).start();
}
// z
function createZ(){
	var container = $("#z");
	var maximum = container.outerWidth() / 2 || 300;
	var data = [];

	function getRandomData(c) {
		if (data.length) {
			data = data.slice(1);
		}
		while (data.length < maximum) {
			if (c) {
				data.push(c);
			} else {
				var previous = data.length ? data[data.length - 1] : 50;
				var y = previous + Math.random() * .6 - .3 - Math.pow(previous/1e3,3);
				data.push(y < -5 ? -5 : y > 5 ? 5 : y);
			}
		}
		// zip the generated y values with the x values
		var res = [];
		for (var i = 0; i < data.length; ++i) {
			res.push([i, data[i]])
		}
		return res;
	}
	var series = [{
		data: getRandomData(0.01),
		lines: {
			fill: false,
		},
		color: "#1ABC9C"
	}];
	var plot = $.plot(container, series, {
		colors: "#ECF0F1",
		grid: {
			color: "#ECF0F1",
			borderWidth: 0,
			minBorderMargin: 20,
			labelMargin: 10,
			margin: {
				top: 8,
				bottom: 8,
				left: 8
			},
			markings: function(axes) {
				var markings = [];
				var xaxis = axes.xaxis;
				for (var x = Math.floor(xaxis.min); x < xaxis.max; x += xaxis.tickSize * 2) {
					markings.push({ xaxis: { from: x, to: x + xaxis.tickSize }, color: "rgba(232, 232, 255, 0.2)" });
				}
				return markings;
			}
		},
		bars: {
			"show": false
		},
		xaxis: {
			tickFormatter: function() {
				return "";
			}
		},
		yaxis: {
			min: -6,
			max: 6
		},
		legend: {
			show: false
		}
	});
	updateZ = function() {
		series[0].data = getRandomData();
		plot.setData(series);
		plot.draw();
	}
}
