html_nodeConfig = `
<div id="config-nodeModal" class="modal fade">
	<div class="modal-dialog">
		<div class="modal-content">
			<div class="modal-header">
				<button type="button" class="close" onclick="dismissNodeModal()" aria-hidden="true">&times;</button>
				<h4 class="modal-title">Node configuration panel</h4>

				<input id="node-graphic-id" type="hidden"/>
			</div>

			<div class="modal-body">
				<div class="form-group">
					<label for="node-category">Category: </label>
					<br>
					<select id="node-category" style="width:100%">
						<option value="" SELECTED> 	Choose a category	</option>
						<option value="question"> 	Question 			</option>
						<option value="block"> 		Block of questions 	</option>
						<option value="result"> 	Result 				</option>
					</select>			
				</div>

				<div id="node-data-selection" class="form-group">
					<label for="node-data">Select a data: </label>
					<br>
					<input id="node-data" type="text" style="min-width:100%; width:100%; max-width:100%;"/>
					<input id="node-data-id" type="hidden" style="width:100%"/>
				</div>

				<div id="node-data-output-block" class="form-group">
					<label>Default outputs : </label>

					<div style="overflow:auto;">
						<div style="float:left; min-width:90%;max-width:90%; margin-left:3%">
							<table class"table table-responsive table-bordered table-stripped" style="width:100%">
								<thead>
									<th style="width:10%; text-align:center">#</th>
									<th style="width:50%; text-align:center">Output</th>
									<th style="width:40%; text-align:center">Target</th>
								</thead>
								<tbody id="node-data-output">
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>

			<div class="modal-footer">
				<button type="button" class="btn btn-danger pull-left" onclick="deleteNode()">Delete</button>
				<button type="button" class="btn btn-default" onclick="dismissNodeModal()">Close</button>
				<button type="button" class="btn btn-primary" onclick="dumpNode()">Insert node</button>
			</div>
		</div>
	</div>
</div>
`;


function injectNodeConfigModal(){
	$('#modal-section').append(html_nodeConfig);
	$('#node-data-selection').hide();
	$('#node-data-output-block').hide();
	configCategorySelection();
}

currentGraphicNodeIndex = -1;
function loadGraphicNode(index, graphicNodeElt){
	currentGraphicNodeIndex = index;
	$('#node-category').val(graphicNodeElt.category).trigger('change');
	$('#node-data').val(graphicNodeElt.dataName);
	$('#node-data-id').val(graphicNodeElt.dataId)

	// Enable autocomplete on modal loading
	configDataSelection(graphicNodeElt.category);

	// Db effect : retrieve data element based on its db id
	var dataElt = getDataElt(graphicNodeElt.category, graphicNodeElt.dataId);
	if(!dataElt){
		console.log('DataElt not found in graphicNodeElt.category array');
	}
	else{
		loadDataOutputs(graphicNodeElt.category, dataElt);
		loadGraphicNodeTarget(graphicNodeElt);
	}
	
	$('#config-nodeModal').modal({backdrop: 'static', keyboard: false});
}


function dumpNode(){
	var error_log = "";
	if($('#node-category').val() == ""){
		error_log += "Node category not set\n"; 
	}	
	if($('#node-data').val() == ""){
		error_log += "Node data not correctly selected\n"; 
	}

	if(error_log != ""){
		$('.modal-header').notify(error_log, {position:'bottom-left', className:'error'});
		return;
	}

	// Create a new node, based on data filled in by user
	var node = new GraphicNodeElt();

	// Check if this node suffers a modification on its category, or on its dataId / dataName
	if(currentGraphicNodeIndex != -1){
		var oldCategory = graphicNodes[currentGraphicNodeIndex].category,
			oldDataId	= graphicNodes[currentGraphicNodeIndex].dataId,
			oldDataName	= graphicNodes[currentGraphicNodeIndex].dataName;

		var hasChanged = (oldCategory != node.category) || (oldDataId != node.dataId) || (oldDataName != node.dataName);
		if(hasChanged){
			disconnectChildren(node.id);
		}
	}

	// Get back targets based on html inputs field
	var targets = retrieveSection('input', 'node-data-output-id-');
	targets.forEach(function(elt, idx){
		var t = elt.value != "" ? elt.value : 'New node';
		node.targets[idx] = t;
	});

	// Update data model
	injectGraphicNodeData(currentGraphicNodeIndex, node);
	dismissNodeModal();
}

// Reset and hide the modal
function dismissNodeModal(){
	$('#node-graphic-id').val("");
	$('#node-category').val("").trigger('change');
	if(currentGraphicNodeIndex != -1){
		currentGraphicNodeIndex = -1;
	}
	$('#config-nodeModal').modal('hide');
}


function GraphicNodeElt(){
	this.id 		= $('#node-graphic-id').val();
	this.category	= $('#node-category').val();
	this.dataId		= $('#node-data-id').val();
	this.dataName 	= $('#node-data').val();
	this.targets	= [];
}

// Delete the current node
function deleteNode(){
	var nodeId 	 = $('#node-graphic-id').val();
	if(nodeId == ROOT_NODE_ID){
		$('.modal-header').notify('You cannot delete the root node.', {position:'bottom-left', className:'error'});
		return;		
	}

	deleteGraphicNode(nodeId);
	dismissNodeModal();
}



/* 
 * HTML outputs management
*/

// Configure autocomplete based on selected category
function configCategorySelection(){
	$('#node-category').on('keypress', function(event){
		event.preventDefault();
		return false;
	});
	
	$('#node-category').on('change', function(){
		// Reset necessary fields
		if($(this).val() == ""){
			$('#node-data-selection > label').text("");
			$('#node-data-selection').hide();
		}
		else{
			$('#node-data-selection > label').text("Select a "+ $(this).val() +" identifier");
			$('#node-data-selection').show();	
		}

		$('#node-data').val(''); 
		$('#node-data-id').val("");
		delOutputs();

		// Configure autocomplete
		if ($(this).val() != "") {
			configDataSelection($(this).val());		
		}
	});
}

// Configure data loading
function configDataSelection(category){
	$('#node-data').on('keypress', function(event){
		// No preventing autocomplete.
		//event.preventDefault();
		//return false;
	});

/*				OLD SEARCH
				source: function(request, response) {
					response($.map(sources, function(value, key) {
						return { 
							label: value.name
						}
					}));
*/


	if (category !== "") {
		var sources = getDataSource(category);

		// Create autocomplete if needed
		if (!$("#node-data").hasClass("ui-autocomplete-input")) {
			$('#node-data').autocomplete({
				minLength: 0,
				autocomplete: true,
				source: function(request, response){
					var search = request.term;
					response($.map(questions, function(value, key){
						if(value.name.substr(0, search.length) == search){
							return { label: value.name	}
						}
					}));
				},
				open: function() { 
					var parent_width = $('#node-data').width();
					$('.ui-autocomplete').width(parent_width);
				},
				select: function(event, ui){
					$(this).val(ui.item.value);
					for (var i = 0; i < sources.length; i++) {
						if($(this).val() == sources[i].name){
							$('#node-data-id').val(sources[i].id);
							loadDataOutputs(category, sources[i]);
						}
					}
				}
			}).bind('focus', function(){ $(this).autocomplete("search"); } );		
		} else {
			// Update datasource of autocomplete
			$('#node-data').autocomplete("option", "source", function(request, response) {
				var search = request.term;
				response($.map(sources, function(value, key) {
					if(value.name.substr(0, search.length) == search){
							return { label: value.name	}
						}
					}));
			});

			// Update also the select event listener to fit the new sources array
			$('#node-data').on( "autocompleteselect", function( event, ui ) {
				$(this).val(ui.item.value);
				for (var i = 0; i < sources.length; i++) {
					if($(this).val() == sources[i].name){
						$('#node-data-id').val(sources[i].id);
						loadDataOutputs(category, sources[i]);
					}
				}
			});

		}
		
	}

}



// Load output texts for the dataElt defined
function loadDataOutputs(dataCategory, dataElt){
	delOutputs();	// Reset existing outputs

	if(dataCategory == 'result'){
		return;
	}
	else if(dataCategory == 'block'){
		addOutput();
		$('#node-data-output-0').val('Block output');
	}
	else if(dataCategory == 'question'){
		for (var i = 0; i < dataElt.outputs.length; i++) {
			addOutput();
			$('#node-data-output-'+i).val(dataElt.outputs[i]);			
		}
	}

	$('#node-data-output-block').show();	// Display output block
}

// Load targets value referencing outputs nodes
function loadGraphicNodeTarget(graphicNodeElt){	
	var targets = graphicNodeElt.targets,
		dataId 	= graphicNodeElt.dataId;

	for (var i = 0; i < targets.length; i++) {
		// Put id of node in hidden field and get the target dataId
		$('#node-data-output-id-'+i).val(targets[i]);
		
		var targetNode = getGraphicNode(targets[i]);		
		if(targetNode){
			var targetNodeElt = getDataElt(targetNode.category, targetNode.dataId);
			if(targetNodeElt){
				$('#node-data-output-target-'+i).val(targetNodeElt.name);
			}
		}
		else{
			$('#node-data-output-target-'+i).val('');
		}
	}
}

// Add html content representing output
function addOutput(){
	$('#node-data-output').append(getNewOutput());
	var i = $('#node-data-output > tr').length - 1;
	configOutputComplete(i);
}

// Delete html content for outputs
function delOutputs(){
	$('#node-data-output').html('');
	$('#node-data-output-block').hide();
}

// Create 1 HTML output content
function getNewOutput(){
	var i = $('#node-data-output > tr').length,
		j = i+1,
		output = `
		<tr>
			<th style="text-align:center">`+j+`</th>
			<th style="padding:1%">
				<input id="node-data-output-`+i+`" style="margin-left:5%; margin-right:5%; max-width:90%" type="text" disabled="disabled"/>
			</th>
			<th style="padding:1%">
				<input id="node-data-output-target-`+i+`" style="margin-left:5%; margin-right:5%; max-width:90%" placeholder="New node"/>
			</th>
			<th style="padding:1%">
				<input id="node-data-output-id-`+i+`" value="" type="hidden">
			</th>
		</tr>
	`;
	return output;
}

// Configure autocomplete plugin for outputs
function configOutputComplete(i){
	var targets = $.map(getPotentialTargets(), function(target){
		return { label:target.dataName, value:target.id }
	});

	// Create autocomplete if needed
	if (!$('#node-data-output-target-'+i).hasClass("ui-autocomplete-input")) {
		$('#node-data-output-target-'+i).autocomplete({
			minLength: 0,
			autocomplete: true,
			source: targets,
			open: function() { 
				var parent_width = $('#node-data-output-target-'+i).width();
				$('.ui-autocomplete').width(parent_width);
			},
			focus: function(event, ui){
				$(this).val(ui.item.label);
				return false;
			},
			select: function(event, ui){
				// Display label, but save the target value (id)
				$(this).val(ui.item.label);
				$('#node-data-output-id-'+i).val(ui.item.value);
				return false;
			}
		}).bind('focus', function(){ $(this).autocomplete("search"); } );
	} else {
		// Update sources / No need to update the select handler function
		$('#node-data-output-target-'+i).autocomplete( "option", "source", targets);
	}
}


function getPotentialTargets(){
	var nodesId 	= graphic.nodes(),
		parentsId 	= recursiveParents($('#node-graphic-id').val(), [], 0),
		inUseId 	= [];

	retrieveSection('input', 'node-data-output-id-').forEach(function(elt){ 
		if(elt.value != ""){
			inUseId.push(elt.value);
		}
	});


	// Avoid parents first
	var targetsId = $(nodesId).not(parentsId).get();

	// Avoid inUsed node if necessary
	for (var i = 0; i < inUseId.length; i++) {
		var idx = targetsId.indexOf(inUseId[i]);
		if(idx >= 0){
			targetsId.splice(idx, 1);
		}
	}

	// Finally construct the list of available targets
	var targets = [];	
	targets.push({dataName:"New node", id:""}); // Push neutral element
	for (var i = 0; i < targetsId.length; i++) {
		var node = getGraphicNode(targetsId[i]);
		if(node){
			targets.push(node);			
		}
	}

	return targets;
}