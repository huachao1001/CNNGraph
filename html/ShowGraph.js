
function parseLayers(layersStr){ 
    var layers = layersStr.split("卍")
    var layerNodes=[]
    var layerMap=[]
    console.log(layers.length)
    for(var i in layers){
        var layer = layers[i] 
        var curNodes=[]
        var nodes = layer.split('&')
        for(var j in nodes){ 
            var nodeStr = nodes[j]
            var gnode = getGNode(nodeStr)
            layerMap[''+gnode.id]=gnode
            curNodes.push(gnode) 
        }
        layerNodes.push(curNodes)
        
    }
    return [layerNodes,layerMap]
}
function printLayers(layers){
    for(var i in layers){
        var layer =layers[i] 
        var line='--->'
        for(var j in layer){
            var node=layer[j]
            line=line+','+node
        }
        console.log(line)
    }
}
function getNodeById(layers,id){
    for(var i in layers){
        var layer=layers[i]
        for(var j in layer){
            var node =layer[j]
            console.log(node.id,'==',id,'?',node.id==id)
            if(node.id==id)
                return node
        }
    } 
    return null
}
function DetailGraph(layers,layerMap){
    this.layers=layers
    this.layerMap=layerMap
    this.left_padding=400
    this.top_padding=TOP_PADDING
    this.ellipse_rx= 80 
    this.ellipse_ry= 20 
    this.rect_w = 80*2
    this.rect_h = 40 
    this.col_width = this.ellipse_rx*2>this.rect_w ? this.ellipse_rx*2 : this.rect_w
    this.row_height = this.ellipse_ry*2>this.rect_h ? this.ellipse_ry*2 : this.rect_h
    this.col_margin=40
    this.row_margin=40
    this.getBBox=function(node,row_idx,col_idx){  
        var l = this.left_padding+(this.col_width+this.col_margin)*col_idx
        var t = this.top_padding+(this.row_height+this.row_margin)*row_idx
        var w=0
        var h=0
        if(node.isOp()){
            w = this.ellipse_rx*2
            h = this.ellipse_ry*2
        }
        else{
            w=this.rect_w
            h=this.rect_h 
        }
        return [l,t,w,h]
    }
    this.genSvg=function(){
        var svgContent=''
        var allOps=[]
        var cols=0 
        var rows=this.layers.length
        for(var i=0;i<this.layers.length;i++){
            var layer = this.layers[i]
            if(layer.length>cols) cols=layer.length
            for(var j=0;j<layer.length;j++){
               var node=layer[j]
               var bbox = this.getBBox(node,i,j)
               node.bbox=bbox 
               if(node.isOp()){
                   allOps.push(node)
               }else{ 
                   svgContent=svgContent+getTensorSvg(node)+'\n'
               }
            }
        }
        for(var i in allOps){
            var op = allOps[i]
            svgContent=svgContent+getOpSvg(op)
            if(op.nextIds.length>0){
                var nextNode=layerMap[''+op.nextIds[0]]
                svgContent=svgContent+'\n'+getArrowSvg(op.bbox,nextNode.bbox)
            }
            for(var i in op.preIds){
                var id = op.preIds[i]
                var input = layerMap[''+id]//getNodeById(this.layers,id) 
                // console.log('--->',id)
                svgContent=svgContent+'\n'+getArrowSvg(input.bbox,op.bbox)
            }
        }
        this.svgW = this.left_padding+(this.col_width+this.col_margin)*cols
        this.svgH = this.top_padding+(this.row_height+this.row_margin)*rows
   
        return svgContent
    }    
}
function MergedNode(nodesArr){
    this.nodesArr=nodesArr
    this.addNode=function(node){
        this.nodesArr.push(node)
    }
    this.toString=function(){
        var names=''
        for(var i in this.nodesArr){
            var node = this.nodesArr[i]
            names=names+node.name+','
        }
        return names
    }
    this.getInputs=function(){
        return this.nodesArr[0].preIds
    }
    this.getOutputs=function(){
        var len = this.nodesArr.length
        return this.nodesArr[len-1].nextIds
    }
}
function MergedGraph(layers,layerMap){
    this.layers=layers
    this.layerMap=layerMap
    this.left_padding=600
    this.top_padding=TOP_PADDING
    this.cur_top=[] 
    this.rect_w = 80*2
    this.rect_h = 40 
    this.col_width =   this.rect_w
    this.row_height =   this.rect_h
    this.col_margin=40
    this.row_margin=40
    this.getMergedBBox=function(node,row_idx,col_idx){
        var opsNum=node.nodesArr.length
        var l = this.left_padding+(this.col_width+this.col_margin)*col_idx
        var t = this.cur_top[''+row_idx]?(this.cur_top[''+row_idx]+this.top_padding):this.top_padding
        // var t =this.cur_top+ this.top_padding+(this.row_height+this.row_margin)*row_idx*2
         
        var w=this.rect_w
        var h=this.rect_h*node.nodesArr.length
        var outputTop=this.top_padding+h+t
        this.cur_top[''+row_idx]=t
        this.cur_top[''+(parseInt(row_idx)+1)]=outputTop+this.rect_h
     
        return [[l,t,w,h],[l,outputTop,w,this.rect_h]]
    }
    this.mergeOps=function(){
        var mergedLayers=[]
        var mergedMap=[]
        for(var i=0;i<this.layers.length;i++){
            var layer = this.layers[i] 
            var curLayer=[]
            for(var j=0;j<layer.length;j++){
                var node=layer[j]
                if(node.isOp()){//对计算节点合并,
                    if(node.needMerge()){//这里已经确保输入长度为1，因为只有输入长度为1的Op才可能合并
                        var inputNode = layerMap[''+node.preIds[0]]
                        var preOp =  layerMap[''+inputNode.preIds[0]]
                        var mergedPreOp = mergedMap[''+preOp.id]
                        mergedPreOp.addNode(node)
                        mergedMap[''+node.id]=mergedPreOp
                    }else{
                        var mergedNode=new MergedNode([node])
                        curLayer.push(mergedNode) 
                        mergedMap[''+node.id]=mergedNode                     
                    }
                } 
            } 
            if(curLayer.length>0){
                mergedLayers.push(curLayer) 
            }
        }
        return mergedLayers
    }
    this.genSvg=function(){
        var mergedLayers = this.mergeOps()
        var svgContent=''
        var cols=0 
        var rows=mergedLayers.length
        // console.log(mergedLayers.length)
        for(var i in mergedLayers){
            var layer =mergedLayers[i]
            if(layer.length>cols) cols=layer.length
            for(var j in layer){
                var mergedOp=layer[j]
                var bbox=this.getMergedBBox(mergedOp,i,j)
                var opBBox=bbox[0] 
                mergedOp.bbox=opBBox
                var output =layerMap[''+ mergedOp.getOutputs()[0]] 
                output.bbox=bbox[1]
                svgContent=svgContent+'\n'+getMergedTensorSvg(output)
                svgContent=svgContent+'\n'+getMergedOpSvg(mergedOp,this.layerMap)
                
                // console.log('block output==>',output.name)
                svgContent=svgContent+'\n'+getArrowSvg(mergedOp.bbox,output.bbox)
                var preIds = mergedOp.getInputs()
                for(var i in preIds){
                    var id = preIds[i]
                    var input = layerMap[''+id] 
                     
                    if(input.bbox){
                        // console.log('block input===>',input.name)
                        svgContent=svgContent+'\n'+getArrowSvg(input.bbox,opBBox)
                    } 
                }
            }
            
        }
        this.svgW = this.left_padding+(this.col_width+this.col_margin)*cols
        this.svgH = this.cur_top[rows]
        return svgContent
    }    
}
function insertSVG(svg){
     var div =document.getElementById('svg_content')
     div.innerHTML =svg
     // console.log(div.innerHTML)
}
var isMergedView=true 


function changeView(obj){
    console.log('--->',obj)
    
    var parsedNodes = parseLayers(data)
    var layers=parsedNodes[0]
    var layerMap = parsedNodes[1]
    LEFT_LINE=[]
    if(!obj){
        obj=document.getElementById('btn')
    }
    var layerout = null
    if(isMergedView){
        obj.innerHTML='展开节点'
        layerout = new MergedGraph(layers,layerMap)
    }else{
        obj.innerHTML='合并节点'
        layerout = new DetailGraph(layers,layerMap)
    }
    var svg = layerout.genSvg()
    svg =  gen_svg_header(layerout.svgW,layerout.svgH,svg) 
    insertSVG(svg)
    isMergedView=!isMergedView
}
changeView(null)
// var layerout = new DetailGraph(layers,layerMap)
// var svg = layerout.genSvg()

// svg =  gen_svg_header(layerout.svgW,layerout.svgH,svg)
// console.log('--->',svg)
// insertSVG(svg)
// var layerout = new MergedGraph(layers,layerMap)
// var svg = layerout.genSvg()
// svg =  gen_svg_header(layerout.svgW,layerout.svgH,svg) 
// insertSVG(svg)