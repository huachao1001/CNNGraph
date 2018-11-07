from NodeObj import OPNode,TSNode
class GNode:
    def __init__(self,id,node):
        self.node=node
        self.name=node.name
        self.id=id
        self.pre_ids=None
        self.next_ids=None
        if isinstance(node,OPNode):
            self.type=node.type
            self.pre=node.inputs
            self.next=node.outputs
        else:
            self.pre=[node.op]
            self.next=node.consumers()
            self.shape=node.shape
    
    def __str__(self):
        if isinstance(self.node,OPNode):
            return 'op☯'+str(self.id)+'☯'+self.type+'☯'+self.name+'☯'\
                   +' '.join([str(id) for id in self.pre_ids])+'☯'\
                   +' '.join([str(id) for id in self.next_ids])
        else:
             
            return 'ts☯'+str(self.id)+'☯'+str(self.shape)+'☯'+self.name+'☯'\
                   +' '.join([str(id) for id in self.pre_ids])+'☯'\
                   +' '.join([str(id) for id in self.next_ids])
class GraphBuilder:
    def __init__(self,file_dst):
        self.file_dst=file_dst  
        self.layers=[]
        self.nodes_in_layers=set()
        self.node_map=dict()
        self.id=0
    def __next_id(self):
        self.id=self.id+1
        return self.id 
    def __add_node_at(self,g_node,layer_idx):
       
        max_layer=len(self.layers)
        if layer_idx>=max_layer:
            self.layers.append([g_node])
        else:
            nodes=self.layers[layer_idx]
            nodes.append(g_node) 
        self.nodes_in_layers.add(g_node.name)
    def __to_gnode(self,nodes):
        gnodes=[]
        for node in nodes:
            g_node=self.node_map.get(node.name,None)
            if g_node is None:
                id=self.__next_id()
                g_node=GNode(id,node)
                self.node_map[node.name]=g_node
            gnodes.append(g_node)
        return gnodes
    def __max_ts_idx(self,ts_list):
        max_idx=-1
        for ts in ts_list:
            for idx,nodes in enumerate(self.layers):
                if ts in nodes and (idx>max_idx):
                    max_idx=idx
        return max_idx
    def __mv_node_to_layer(self,gnode,layer_idx):
        for idx,nodes in enumerate(self.layers):
            if gnode in nodes:
                if not idx==layer_idx:
                   nodes.remove(gnode)
                   self.layers[layer_idx].append(gnode)
                break
    def __print_layers(self):
        for idx,layer in enumerate(self.layers):
            dnames=[]
            for node in layer:
                dnames.append(node.name.split('/')[-1])
            print('layer-->',idx,','.join(dnames))          
    def add_op(self,op_node):
         
        inputs = self.__to_gnode(op_node.inputs)
        op_gnode = self.__to_gnode([op_node])[0]
        outputs = self.__to_gnode(op_node.outputs)
        max_idx=self.__max_ts_idx(inputs)
        # print('max_idx-->',max_idx)
        
        if max_idx<0:
            for input in inputs:
                self.__add_node_at(input,0)
            self.__add_node_at(op_gnode,1)
            op_idx=1
        else:
            op_idx=max_idx+1
            self.__add_node_at(op_gnode,max_idx+1)
            for input in inputs: 
                if input.name in self.nodes_in_layers:#已经添加过
                    continue
                else:
                    self.__add_node_at(input,max_idx)
                     
        if len(outputs)>0:
            output=outputs[0]
            if not output.name in self.nodes_in_layers:#未添加 
                self.__add_node_at(output,op_idx+1)
                
        # print('==============================',len(outputs))
        # self.__print_layers()
    def __layers_to_str(self):
        str_layers=[]
        for layer in self.layers: 
            layer = [str(l) for l in layer]
            str_layers.append('&'.join(layer))
        return '卍'.join(str_layers)
    def __set_ids(self):
        for layer in self.layers:
            for node in layer:
                node.pre_ids=[]
                node.next_ids=[]
                for pre in node.pre:
                    gnode = self.node_map.get(pre.name,None)
                    if not gnode is None:
                        node.pre_ids.append(gnode.id)
                for next in node.next:
                    gnode = self.node_map.get(next.name,None)
                    if not gnode is None:
                        node.next_ids.append(gnode.id)
    def build(self):  
        # self.__print_layers()
        with open('html/show_graph.html','r',encoding='utf-8') as r:
            tmp_html=r.read()
        with open('html/NodeObj.js','r',encoding='utf-8') as r:
            js1=r.read()
        with open('html/ShowGraph.js','r',encoding='utf-8') as r:
            js2=r.read()
        self.__set_ids()
        data=self.__layers_to_str()
        data = '<script type="text/javascript">data="'+data+'";</script>'
        with open(self.file_dst,'w+',encoding='utf-8') as w:
            w.write(data+'\n'+tmp_html)
            w.write( '\n<script type="text/javascript">'+js1+'</script>')
            w.write( '\n<script type="text/javascript">'+js2+'</script>') 
 