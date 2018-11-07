
from NodeObj import OPNode 
def get_dropout_op_from(ops,start_dropout_op): 
    op_queue=[start_dropout_op]
    do_ops=set() 
    while len(op_queue)>0:
        op = op_queue.pop(0) 
        for inp in op.inputs:
            if (inp.op in ops) and ('dropout' in inp.op.name) and (not inp.op in do_ops):
                op_queue.append(inp.op) 
        for output in op.outputs:
            for next_op in output.consumers(): 
                if (next_op in ops) and ('dropout' in next_op.name) and (not next_op in do_ops): 
                    op_queue.append(next_op)
        do_ops.add(op) 
    return   do_ops  

def merge_dropout_ops(sorted_ops,dropout_ops):
    dropout_idx=0
    merged_dropout=[]
    dp_input_ops=[] 
    for dropout in dropout_ops:
        dropout_input_tensor=set()
        dropout_output_tensor=set()
        input_op  = set()
        output_op= set()
        keep_prob=None 
        for dp in dropout:
            if 'keep_prob' in dp.name:
                keep_prob=dp
            for input in  dp.inputs:
                if input.op in sorted_ops and (not input.op in dropout):
                    dropout_input_tensor.add(input)
                    input_op.add(dp)
            for output in dp.outputs:
                for op in output.consumers():
                    if op in sorted_ops and (not op in dropout):
                        dropout_output_tensor.add(output)  
                        output_op.add(dp)
        name = 'Merged_dropout:'+str(dropout_idx)+'_'+str(keep_prob.outputs[0].eval())
        dp_op = OPNode.my_init('Dropout',list(dropout_input_tensor),list(dropout_output_tensor) , name)  
        for inp in dropout_input_tensor:
            consumer=set()
            for c_op in inp.consumers():
                if c_op.name in [op.name for op in input_op]:
                   consumer.add(dp_op)
                else:
                    consumer.add(c_op)
        for output in dropout_output_tensor:
            output.op=dp_op
        dropout_idx=dropout_idx+1  
        merged_dropout.append(dp_op)
        dp_input_ops.append(input_op) 
    return merged_dropout,dp_input_ops
def get_dropout_op_index(dp_op,dp_input_ops):
    for idx,dp_set in enumerate(dp_input_ops):
        if dp_op in dp_set:
            return idx
    return -1
def merge_dropout(sorted_ops):
    visited_op_name=set()
    dropout_ops = []
    for op in sorted_ops:
        if op.name in visited_op_name: 
            continue
        if 'dropout' in op.name:
            do_ops = get_dropout_op_from(sorted_ops,op)
            for v_op in do_ops:
                visited_op_name.add(v_op.name)
            dropout_ops.append( do_ops )
    merged_dp_ops,dp_input_ops = merge_dropout_ops(sorted_ops,dropout_ops)
    new_sorted_ops=[]
    visited_dropout_idx=set()
    for op in sorted_ops:
        if 'dropout' in op.name:
            idx = get_dropout_op_index(op, dp_input_ops)
            if idx>=0 and (not idx in visited_dropout_idx):
                dp_op = merged_dp_ops[idx]
                new_sorted_ops.append(dp_op)
                visited_dropout_idx.add(idx)
        else:
            new_sorted_ops.append(op)
    return new_sorted_ops
def merge_identity_const(sorted_ops):
    new_sorted_ops=[]
    for op in sorted_ops:
        if op.type=='Const':#忽略Const
            continue
        if op.type=='Identity':#去掉Identity  
            op.outputs[0].name=op.inputs[0].name 
            continue 
        new_sorted_ops.append(op)
    return new_sorted_ops
def get_squeeze_end_op(sorted_ops,start_squeeze_op):
    ops_in_path=set()
    end_op=None 
    flag=False
    for op in sorted_ops:
        if op == start_squeeze_op:
            flag=True
        if flag:
            ops_in_path.add(op)
            if op.type=='Reshape':
                end_op=op
                break 
    visited_ops=set() 
    if not end_op is None:
        ops_in_path.remove(start_squeeze_op)
        op_queue=list(ops_in_path)
       
        while len(op_queue)>0:
            op =op_queue.pop(0) 
            for inp in op.inputs:
                if inp.op !=start_squeeze_op and (not inp.op in visited_ops):
                    op_queue.append(inp.op)
            visited_ops.add(op)
    print(len(ops_in_path))
    return end_op,visited_ops
def merge_squeeze(sorted_ops):
    new_sorted_ops=[]
    need_remove_ops=set()
    for op in sorted_ops:
        if op.type=='Squeeze':
           end_op,need_removed = get_squeeze_end_op(sorted_ops,op)
           if not end_op is None: 
               ts = end_op.outputs[0]
               ts.op=op
               op.outputs=[ts]
               need_remove_ops|=need_removed
        new_sorted_ops.append(op) 
    new_sorted_ops=[op for op in new_sorted_ops if not op in need_remove_ops]
    return new_sorted_ops
def merge_layers(sorted_ops):
    sorted_ops = merge_dropout(sorted_ops)
    sorted_ops = merge_identity_const(sorted_ops)
    sorted_ops = merge_squeeze(sorted_ops)
    return sorted_ops