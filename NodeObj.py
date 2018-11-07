class OPNode:
    def __init__(self,node):
        if not node is None:
            self.node=node 
            self.type=node.type
            self.inputs=node.inputs
            self.outputs=node.outputs
            self.name = node.name 
    @classmethod
    def my_init(cls,type,inputs,outputs,name):
        thiz = cls(None)
        thiz.node=None
        thiz.type= type
        thiz.inputs= inputs
        thiz.outputs= outputs
        thiz.name = name 
        return thiz
    def __eq__(self,obj):
        if obj is None:
            return False
        if obj.name:
            return self.name== obj.name
        return False
    def __hash__(self):
        return self.node.__hash__()
class TSNode:
    def __init__(self,node,op_node):
        self.node=node  
        self.op=op_node 
        self.dtype=node.dtype
        self.name = node.name 
        self.shape=node.shape 
        self.get_shape=node.get_shape
        self.next_ops=node.consumers()
   
    def consumers(self):
        return self.next_ops      
    def eval(self):
        return self.node.eval()
    def __eq__(self,obj):
        if obj is None:
            return False
        if obj.name:
            return self.name== obj.name
        return False
    def __hash__(self):
        return self.node.__hash__()