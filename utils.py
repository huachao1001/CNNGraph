 
def create_graph(ops):
  
  n = len(ops)
  G = [[] for i in range(n)]
  op_name_to_index = dict() 
  for i, op in enumerate(ops):
    op_name_to_index[op.name] = i 
  for i, op in enumerate(ops):
    for inp in op.inputs:
      G[op_name_to_index[inp.op.name]].append(i)

  return G 
def push_stack(stack, node, in_stack,ops):
  stack.append(node)
  if node in in_stack:
    print('cycles---->',ops[node])
    raise ValueError('Graph has cycles.')
  else:
    in_stack[node] = True

def get_unvisited_child(G, node, not_visited):
  for child in G[node]:
    if child in not_visited:
      return child
  return -1

 
#对计算节点排序，使得每个计算节点所依赖的计算节点在前面
def  sort_ops(ops):  

  G = create_graph(ops)
  n = len(ops) 
  topological_label = [-1 for i in range(n)]
  stack = []
  in_stack = dict()
  not_visited = dict.fromkeys([i for i in range(n)])
  label_counter = n-1

  while len(not_visited) > 0:
    node = list(not_visited.keys())[0]
    push_stack(stack, node, in_stack,ops)
    while len(stack) > 0:
      node = get_unvisited_child(G, stack[-1], not_visited)
      if node != -1:
        push_stack(stack, node, in_stack,ops)
      else:
        node = stack.pop()
        in_stack.pop(node)
        not_visited.pop(node)
        topological_label[node] = label_counter
        label_counter -= 1

  return [x for _, x in sorted(zip(topological_label, ops))]
 
def _get_ops_in_path(from_tensors,to_tensors,ops):
    invalid_ops=[]
    valid_ops=ops.copy()
    removed=[]
    find_invalid=True
    in_tensors = [tensor.name for tensor in from_tensors] 
    out_tensors = [tensor.name for tensor in to_tensors]
    while find_invalid:
      find_invalid=False
      for op in valid_ops:  
          for input in op.inputs:
              if input.name in out_tensors:
                out_tensors=out_tensors+[out.name for out in op.outputs]
                find_invalid=True
                break
          for output in op.outputs:
              if output.name in in_tensors:
                in_tensors=in_tensors+[input.name for input in op.inputs]
                find_invalid=True
                break
          if find_invalid:
             invalid_ops.append(op)
    
      valid_ops=[op for op in valid_ops if not op in invalid_ops]       
    print('inputs===========================')
    print([op.type for op in invalid_ops if 'Con' in op.name])
    print('end inputs========================')
    print(out_tensors)
    return valid_ops
        