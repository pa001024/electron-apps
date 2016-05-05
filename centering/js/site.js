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

var updateXY,invXY;
// 轴
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

var mul_a = randx(0.5, 3),// 倍乘系数
	scl_a = randx(0.7,1.2),// 拉伸系数
	flt_a = mul_a * randx(.005, .009),// 浮动系数
	smp_a = randx(20, 40);// 采样系数
// 数据
var DataHelper = {
	data: [],
	dataSize: 10000, // 数据大小
	sampleSize: 100, // 显示大小
	time: null,
	duration: 0,
	stdLine: [
		[{
			coord: [8.0*mul_a, 0*mul_a*scl_a],
		}, {
			coord: [9.5*mul_a, 50*mul_a*scl_a]
		}],
		[{
			coord: [10.3*mul_a, 0*mul_a*scl_a]
		}, {
			coord: [11.7*mul_a, 50*mul_a*scl_a]
		}]
	],
	/// 随机数据生成算法
	nextData: (function(){
		// 实际数据
		var sampleData = [
			[ 0, 0 ],
			[ 2, 0.6 ],
			[ 4, 2 ],
			[ 8, 3.6 ],
			[ 10, 5.4 ],
			[ 10.1, 5.5 ],
			[ 10.2, 7 ],
			[ 10.3, 8.4 ],
			[ 10.7, 12.1 ],
			[ 10.8, 16.4 ],
			[ 10.9, 19.6 ],
			[ 11, 27.6 ],
			[ 11.1, 29.6 ],
			[ 11.2, 30.6 ],
			[ 11.3, 34.6 ],
			[ 11.4, 39 ],
			[ 11.5, 42.5 ],
			[ 11.6, 46.5 ],
			[ 11.7, 48.5 ],

			[ 11.8, 51 ],
			[ 9.5, 49.2 ],
			[ 9.4, 46.7 ],
			[ 9.3, 41.9 ],
			[ 9.2, 39.5 ],
			[ 9.1, 37.5 ],
			[ 9, 34.7 ],
			[ 8.9, 33 ],
			[ 8.8, 27.3 ],
			[ 8.7, 24 ],
			[ 8.6, 20 ],
			[ 8.5, 14.6 ],
			[ 8.4, 14.5 ],
			[ 8, 12.2 ],
			[ 4, 8.7 ],
			[ 2, 3 ],
			[ 0, 0 ],
		];
		var i = 0, j = 0, m = ~~Math.ceil(smp_a*randx(.3, 1)),
			lastrr = 0;
		return function(jj) {
			var rr = i==20 ? 0 : randx(lastrr, (j*(1/m))),
				val = [
				(sampleData[i][0]
					- (sampleData[i][0]-sampleData[i?i-1:sampleData.length-1][0])*(1-rr))
					*(mul_a + flt_a*randx(-1, 1)),
				scl_a*(sampleData[i][1]
					- (sampleData[i][1]-sampleData[i?i-1:sampleData.length-1][1])*(1-rr))
					*(mul_a + flt_a*randx(-1, 1))
				];
			if (++j >= m) {
				j = lastrr = 0;
				m = ~~Math.ceil(smp_a*randx(0, 1));
				if (++i >= sampleData.length) i = 0;
			} else lastrr = rr;
			if (jj) {lastrr=i=j=0;}
			return val;
		};
	})(),
	next: function() {
		this.data.push(this.nextData());
		while (this.data.length > this.dataSize) this.data.shift();
	},
	getAxis: function(l) {
		// zip the generated y values with the x values
		var res = [];
		for (var i = this.data.length >= this.sampleSize?
				0 : this.sampleSize - this.data.length; i < this.sampleSize; ++i) {
			res.push([i, this.data[this.data.length - this.sampleSize + i][l]]);
		}
		return res;
	},
	// 获取x轴数据
	xaxis: function() { return this.getAxis(0) },
	// 获取y轴数据
	yaxis: function() { return this.getAxis(1) },
	// 清除数据
	clear: function() { this.data=[] },
	calc: function() {

	},
};

createXY();
createConfig();

// init data
PointsHelper.setLength(15);
PointsHelper.add("", 1.2);
PointsHelper.add("", 5.0);
PointsHelper.add("", 12.5);

// event
$("#btn-start").click(function() {
	var v = $(this).data("tg");
	$(this).text(v?"开始采样":"停止采样");
	$(this).switchClass(v?"btn-danger":"btn-primary",v?"btn-primary":"btn-danger");
	$(this).data("tg",!v);
	if (v) {
		clearInterval(invXY);
		DataHelper.duration = new Date() - DataHelper.time + DataHelper.duration;
	}
	else {
		DataHelper.time = new Date();
		invXY = setInterval(function(){
			DataHelper.next();
			updateXY();
			var d=new Date(new Date()-DataHelper.time-288e5+DataHelper.duration).toTimeString().split(" ")[0];
			$("#lbl-data-time").text(d);
		}, 1e3/30);
	}
});
$("#btn-clear").click(function() {
	DataHelper.clear();
	DataHelper.time = new Date();
	DataHelper.duration = 0;
	updateXY();
	$("#lbl-data-time").text("00:00:00");
});

const dialog = require('electron').remote.dialog;
$("#btn-save").click(function() {
	dialog.showSaveDialog();
});

$("#btn-editpoints,#btn-editpoints-close").click(function() {
	var elm = $("#config-holder");
	if(elm.hasClass("hideact")) elm.show();
	setTimeout(function() { elm.toggleClass("hideact"); }, 0);
	setTimeout(function() { if (elm.hasClass("hideact")) elm.hide(); }, 500);
});
$("#btn-editprop,#btn-editprop-close").click(function() {
	var elm = $("#prop-holder");
	if(elm.hasClass("hideact")) elm.show();
	setTimeout(function() { elm.toggleClass("hideact"); }, 0);
	setTimeout(function() { if (elm.hasClass("hideact")) elm.hide(); }, 500);
});

$("#btn-about").click(function() {
	location.reload();
});
$("#btn-newpoint").click(function() {
	if ($("#point-distance").val()) {
		PointsHelper.add("", $("#point-distance").val());
		$("#point-distance").val("");
		$("#point-distance").parent(".form-group").removeClass("has-error");
	} else {
		$("#point-distance").parent(".form-group").addClass("has-error");
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
		$("#point-length").parent(".form-group").removeClass("has-error");
	} else {
		$("#point-length").parent(".form-group").addClass("has-error");
	}
});

var dj = 1;
// 设置参数
$("#btn-setprop").click(function() {
	if (+$("#point-prop").val()) {
		dj = +$("#point-prop").val();
		$("#lbl-showprop").text(dj);
		$("#point-prop").val("");
		$("#point-prop").parent(".form-group").removeClass("has-error").addClass("has-success").delay(1e3).removeClass("has-success");
	} else {
		$("#point-prop").parent(".form-group").removeClass("has-success").addClass("has-error");
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
// x,y
function createXY() {
	var elmx = $("#x"), elmy = $("#y");
	var maximum = DataHelper.sampleSize;
	var data = [];
	for (var i = 0; i < maximum; i++) {
		data.push([0,0]);
	}
	
	var xmax, ymax;
	for (var i = 0; i < 1000; i++) {
		var v = DataHelper.nextData();
		xmax = xmax > v[0]?xmax:v[0];
		ymax = ymax > v[1]?ymax:v[1];
	}
	DataHelper.nextData(1);
	var seriesx = [{
		data: [],
		lines: {
			fill: false,
		},
		color: "#1ABC9C"
	}];
	var seriesy = [{
		data: [],
		color: "#1ABC9C"
	}];
	var plotx = $.plot(elmx, seriesx, {
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
			},
			min: 0,
			max: maximum
		},
		yaxis: {
			min: 0,
			max: xmax*1.1
		},
	});
	var ploty = $.plot(elmy, seriesy, {
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
			},
			min: 0,
			max: maximum
		},
		yaxis: {
			min: 0,
			max: ymax*1.1
		},
	});
	var plotxy = echarts.init(document.getElementById('z'));
	plotxy.setOption({
		tooltip : {
			trigger: 'axis',
			showDelay : 0,
			axisPointer:{
				show: true,
				type : 'cross',
				lineStyle: {
					type : 'dashed',
					width : 1
				}
			},
			zlevel: 1
		},
		xAxis: [{
				type : 'value',
				scale: true
		}],
		yAxis: [{
				type : 'value',
				scale: true
		}],
		series: [{
			name:'拟合',
			type:'scatter',
			large: true,
			largeThreshold: 0,
			symbolSize: 3,
			data: [],
			markLine: {
				symbol: 'none',
				lineStyle: {
					normal: {
						color: "#3498DB"
					}
				}
			}
		},{
			name: '拟合数据',
			type: 'line',
			showSymbol: false,
			data: [],
		}],
	});
	updateXY = function() {
		seriesx[0].data = DataHelper.xaxis();
		plotx.setData(seriesx);
		plotx.draw();
		seriesy[0].data = DataHelper.yaxis();
		ploty.setData(seriesy);
		ploty.draw();
		if (DataHelper.data.length>20*smp_a) {
			plotxy.setOption({
				series: [{
					data: DataHelper.data,
					markLine: {
						data: DataHelper.stdLine,
					}
				}]
			});
			var r = Math.random(), f = Math.random();
			r = f > 0.5 ? r*r : -r*r;
			var rst = 9.15*mul_a + r/DataHelper.data.length;
			$("#lbl-data-result").text(~~(rst*1e6)/1e6);
			$("#lbl-data-result2").text(~~(rst * dj *1e6)/1e6);
		}
		else
			plotxy.setOption({
				series: [{
					data: DataHelper.data,
				}]
			});
			
		$("#lbl-data-count").text(DataHelper.data.length);
	};
}