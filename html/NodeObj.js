var TOP_PADDING=40
var LEFT_LINE = []
var OP_COLOR={'relu':'#B8E9AE','relu6':'#B8E9AE','conv2d':'#FF9999','batchnorm':'#FFA768','depthwiseconv2d':'	#87CEFA'}
var RENAME={'DepthwiseConv2dNative':'DepthwiseConv2D','FusedBatchNorm':'BatchNorm','ConcatV2':'Concat'}
var DEFAULT_OP_COLOR='#80B1D3'
var NEED_MERGE_OPS=['relu','batchnorm','biasadd']
function GNode(type,idStr,opTypeOrTsShape,name,preIdsStr,nextIdsStr){
    this.type=type
    this.opTypeOrTsShape=opTypeOrTsShape
    this.name=name
    this.fullyName=name
    if(type=='op'){
        if(RENAME[opTypeOrTsShape])
            this.displayName=RENAME[opTypeOrTsShape]
        else
            this.displayName=opTypeOrTsShape
    }else{
        var tsName=name.split('/')
        this.displayName=tsName[tsName.length-1]
        this.shape=opTypeOrTsShape
    }
    this.id=parseInt(idStr)
    this.preIds=[]
    this.nextIds=[] 
    if(preIdsStr){
        var preIdsArr=preIdsStr.split(' ')
        for(var i in preIdsArr){
            this.preIds.push(parseInt(preIdsArr[i]))
        }
    }
    if(nextIdsStr){
        var nextIdsArr=nextIdsStr.split(' ')
        for(var i in nextIdsArr){
            this.nextIds.push(parseInt(nextIdsArr[i]))
        }
    }
    
    this.isOp=function(){
        return this.type=='op'
    }
    this.toString=function(){
        return this.name
    } 
    this.needMerge=function(){
        if(this.isOp()){
            for(var i in NEED_MERGE_OPS){
                var k=NEED_MERGE_OPS[i]
                var lowerName=this.displayName.toLowerCase()
                if(lowerName.indexOf(k)>=0){
                    return true
                }
            }
        }
        return false
    }
    this.getShapeList=function(){
        var shapeList=[]
        if(this.shape&&this.shape.length>=2){
            var len = this.shape.length
            var shape=this.shape.substring(1,len-1)
            var arr = shape.split(',')
            for(var i in arr){
                shapeList.push(parseInt(arr[i]))
            }    
        } 
        return shapeList
       
    }
    // console.log(this.name)
    if(type=='op'&&opTypeOrTsShape.toLowerCase()=='dropout'){
         var arr = name.split('_')
         this.fullyName=arr.slice(0,arr.length-1) 
         this.displayName= this.displayName+'(keep='+arr[arr.length-1]+')'
    }
    
}
function getGNode(nodeStr){  
    arr = nodeStr.split('☯') 
    obj = new GNode(arr[0],arr[1],arr[2],arr[3],arr[4],arr[5])  
    return obj
}

function gen_svg_header(width,height,content){
    var header = '<svg width="'+ width +'" height="'+ height +'"  version="1.1" xmlns="http://www.w3.org/2000/svg">'
    header = header+'\n'+ '<defs> '+ 
             '    <marker id="arrow" markerWidth="6" markerHeight="6" refx="6" refy="3" orient="auto" markerUnits="strokeWidth"> '+ 
             '    <path d="M0,0 L0,6 L6,3 z" fill="#ccc" /> </marker> </defs>\n'
    return header+content+'</svg>'
}
function getLeftLine(topY,bottomY,bboxLeft){
    var left=null
    for(var leftRegion in LEFT_LINE){
        var arr = leftRegion.split('-')
        var fromY=parseInt(arr[0])
        var toY=parseInt(arr[1])
        if((topY>=fromY&&topY<=toY)||(bottomY>=fromY&&bottomY>=toY)){
           left = LEFT_LINE[leftRegion]-20
           delete LEFT_LINE[leftRegion]
           var min=fromY<toY?fromY:toY
           var max=toY>bottomY?toY:bottomY
           LEFT_LINE[min+'-'+max]=left
           return left           
        }
    }
    if(!left){
        left = bboxLeft-20
        LEFT_LINE[min+'-'+max]=left
    }
    return left
}
function getArrowSvg( from_bbox,to_bbox){
    var s_x=from_bbox[0]
    var s_y=from_bbox[1]
    var s_w=from_bbox[2]
    var s_h=from_bbox[3]
    var e_x=to_bbox[0]
    var e_y=to_bbox[1]
    var e_w=to_bbox[2]
    var e_h=to_bbox[3]
    var arr_svg='';
    if((s_x==e_x)&&(Math.abs(s_y-e_y)>(s_h+TOP_PADDING))){ 
        // LEFT_IDX=LEFT_IDX+1
        // var first_x=s_x-10*(LEFT_IDX)
        var first_y=s_y+(s_h)/2
        var second_y=e_y+(e_h)/2
        var first_x=getLeftLine(first_y,second_y,s_x)
        arr_svg='<line x1="'+ s_x+'" y1="'+ first_y+'" x2="'+first_x+'" y2="'+first_y+ '" style="stroke:#ccc;stroke-width:2"/>' 
        arr_svg =arr_svg+'<line x1="'+ first_x +'" y1="'+ first_y +'" x2="'+ first_x +'" y2="'+ second_y + '" style="stroke:#ccc;stroke-width:2"/>' 
        arr_svg =arr_svg+'<line x1="'+ first_x +'" y1="'+ second_y +'" x2="'+ s_x +'" y2="'+ second_y + '" style="stroke:#ccc;stroke-width:2" marker-end="url(#arrow)"/>'  
    }else{
        var from_x = s_x+(s_w)/2
        var from_y = s_y+s_h
        var to_x = e_x+(e_w)/2
        var to_y = e_y 
        arr_svg ='<line x1="'+ from_x +'" y1="'+ from_y +'" x2="'+ to_x +'" y2="'+ to_y + '" style="stroke:#ccc;stroke-width:2" marker-end="url(#arrow)"/>' 
    }
    return  arr_svg
}
function getOpSvg(op_node){
    var x=op_node.bbox[0]
    var y=op_node.bbox[1]
    var w=op_node.bbox[2]
    var h = op_node.bbox[3]
    var cx = x+w/2
    var cy = y+h/2
    var txt=op_node.displayName
    var lower_txt = txt.toLowerCase() 
    var color = DEFAULT_OP_COLOR
    if(OP_COLOR[lower_txt]){
        color=OP_COLOR[lower_txt]
    } 
    var fully_name=op_node.fullyName
    var txt_svg = '<text text-anchor="middle" x="'+ cx +'" y="'+ (cy+5)+'" fill="'+color+'"><title>'+fully_name+'</title>'+txt+'</text>'
    var op_svg = '<ellipse cx="'+ cx +'" cy="'+ cy +'" rx="'+( w/2)+'" ry="'+  (h/2)+'" style="fill:#fff;stroke:'+color+';stroke-width:4"><title>'+ fully_name+'</title></ellipse>'
    txt_svg =txt_svg+ '<text font-size="12" text-anchor="middle" x="'+ cx +'" y="'+ (cy+h-5)+'" fill="#999">'+fully_name+'</text>' 
    
    return op_svg+txt_svg
}
function getTensorSvg( tensor_node){ 
    var x=tensor_node.bbox[0]
    var y=tensor_node.bbox[1]
    var w=tensor_node.bbox[2]
    var h=tensor_node.bbox[3]
    var cx = x+w/2
    var cy = y+h/2
    var fully_name = tensor_node.fullyName
    var txt = tensor_node.displayName
    var txt_svg = '<text  text-anchor="middle" x="'+(cx)+'" y="'+ (cy-5)+'" fill="#999"><title>'+fully_name+'</title>'+txt+'</text>' 
    var rect_svg = '<text  font-size="14" text-anchor="middle" x="'+(cx)+'" y="'+ (cy+15)+'" fill="#999"><title>'+fully_name+'</title>'+ tensor_node.shape +'</text>' 
    var tensor_svg = '<rect x="'+(x)+'" y="'+(y)+'" width="'+(w)+'" height="'+( h)+
                    '" style="fill:#fff;stroke-width:2;stroke:#ccc"> <title>'+fully_name+'</title></rect>'
   
    return tensor_svg+txt_svg +rect_svg
    
}    
function getMergedTensorSvg( tensor_node){ 
 
    var x=tensor_node.bbox[0]
    var y=tensor_node.bbox[1]
    var w=tensor_node.bbox[2]
    var h=tensor_node.bbox[3]
    var cx = x+w/2
    var cy = y+h/2
    var fully_name = tensor_node.fullyName
    // var txt = tensor_node.displayName
    // var txt_svg = '<text  text-anchor="middle" x="'+(cx)+'" y="'+ (cy-5)+'" fill="#999"><title>'+fully_name+'</title>'+txt+'</text>' 
    // var rect_svg = '<text  font-size="14" text-anchor="middle" x="'+(cx)+'" y="'+ (cy+15)+'" fill="#999"><title>'+fully_name+'</title>'+ tensor_node.shape +'</text>' 
    // var tensor_svg = '<rect x="'+(x)+'" y="'+(y)+'" width="'+(w)+'" height="'+( h)+
                    // '" style="fill:#fff;stroke-width:2;stroke:#ccc"> <title>'+fully_name+'</title></rect>' 
    var rect_svg = '<text  font-size="14" text-anchor="middle" x="'+(cx)+'" y="'+ (cy+5)+'" fill="#999"><title>'+fully_name+'</title>'+ tensor_node.shape +'</text>' 
    var tensor_svg = '<rect x="'+(x)+'" y="'+(y)+'" width="'+(w)+'" height="'+( h)+
                     '" style="fill:#fff;stroke-width:2;stroke:#ccc"> <title>'+fully_name+'</title></rect>'
   
    return tensor_svg  +rect_svg
    
}
function checkIsType(lowerType,checkedStr){
    var lowerStr = checkedStr.toLowerCase() 
    if(lowerStr.indexOf(lowerType)>=0)
        return true
    return false
}  
function getSecTitle(gnode,gnodeMap){
    var displayName=gnode.displayName
    if(checkIsType('conv2d',displayName)){
        var weightShape=null
        for(var i in gnode.preIds){
               var preNode=gnodeMap[gnode.preIds[i]]
               var lowerName = preNode.displayName.toLowerCase()
               if(lowerName.indexOf('weights')>=0){
                    weightShape=preNode.getShapeList()
                    break
               }
        } 
        if(weightShape&&weightShape.length==4){
            if(checkIsType('depthwise',displayName)){//depthwise 
               return 'k_hw='+weightShape[0]+'x'+weightShape[1]+',out_c:'+(weightShape[2]*weightShape[3])
            }else{//conv2d
               return 'k_hw:'+weightShape[0]+'x'+weightShape[1]+',out_c:'+weightShape[3]
            }
        }
    }
    return null
}  
function getMergedOpSvg(mergedNode,gnodeMap){
    var svg=''
    var x=mergedNode.bbox[0]
    var y=mergedNode.bbox[1]
    var w=mergedNode.bbox[2]
    var h = mergedNode.bbox[3]
    var layerH=h/mergedNode.nodesArr.length
    var rectSvg=''
    var titleSvg=''
    var secSvg=''
    var color = DEFAULT_OP_COLOR
    var borderColor='#ccc'
    for(var i in mergedNode.nodesArr){
        var op = mergedNode.nodesArr[i]
        
        var cx = x+w/2
        var cy = y+layerH*i+layerH/2
        
        var fully_name = op.fullyName
        var txt = op.displayName 
        var lower_txt = op.displayName.toLowerCase() 
        if(OP_COLOR[lower_txt]){ 
            color=OP_COLOR[lower_txt]
            borderColor=color
        } 
         
        var secTitle = getSecTitle(op,gnodeMap)
        if(secTitle){
            titleSvg += '<text  text-anchor="middle" x="'+(cx)+'" y="'+ (cy-5)+'" fill="#000"><title>'+fully_name+'</title>'+txt+'</text>' 
            secSvg += '<text  font-size="12" text-anchor="middle" x="'+(cx)+'" y="'+ (cy+15)+'" fill="#000"><title>'+fully_name+'</title>'+secTitle+ '</text>'  
        }else{
            titleSvg += '<text  text-anchor="middle" x="'+(cx)+'" y="'+ (cy+5)+'" fill="#000"><title>'+fully_name+'</title>'+txt+'</text>'  
        }
        rectSvg += '<rect x="'+(x)+'" y="'+(y+i*layerH)+'" width="'+(w)+'" height="'+( layerH)+
                        '" style="fill:'+color+';stroke-width:2;stroke:'+borderColor+'"> <title>'+fully_name+'</title></rect>' 
    }
    return rectSvg+secSvg+titleSvg
}
        
    
    
    
    
    
    
    
    