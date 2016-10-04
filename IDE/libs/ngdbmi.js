/*
 *  gdbMI for node.js.
 * 
 *  A simple wrapper around the gdbMI interface for Node.js
 * 
 *  2014 Jean-Baptiste BESNARD.
 * 
 * LICENCE : Cecill-C (fully LGPL compatible)
 * as found on http://www.cecill.info/
 * 
 */
 
 /*
  * GDB/MI specs can be found at:
  * https://sourceware.org/gdb/current/onlinedocs/gdb/GDB_002fMI.html#GDB_002fMI
  */
 
 
 /*###############################################################
  #                   GDB WRAPPER DEFINITION                     #
  # Defines how gdbMI is interfaced with the undelying gdb       #
  # process. This is simply a way of defining a read/write       #
  # interface on top of node event notification system. This     #
  # way new wrappers can be defined to define other data sources #
  ##############################################################*/

var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

/* This creates a gdb process on a given command
 * this object is a generic interface to the spawn
 * command as we want to be able to listen on other
 * types of streams for example sockets or whatever...
 * 
 * Interface of a gdbMI wrapper is the following:
 * 
 *  .init( program_and_args ) : called to instantiate the interface
 *  .write() : used to send data to the gdb process
 *  .interrupt() : sends a SIGINT to a PID (to enhance ...)
 *  .onData() : calls the wrapper function when data are available
 *  .onClose() : calls the wrapper function when the stream ends
 *  .onError() : calls the wrapper function when an error occurs
 * 
 *  */

function gdbProcessWrapper( command_and_args )
{
	/* ############################################## */
	/* ############################################## */
	
	/* Initialize */
	gdbProcessWrapper.prototype.init = function(command_and_args)
	{
		if( !command_and_args )
			command_and_args = "";
		
		/* Split the command to separate args */
		var cmd = command_and_args.trim().split(" ");
		
		if( cmd.length == 0 )
		{
			throw("No command provided");
		}

		/* Build arg array */
		var gdb_args = [ "--interpreter=mi",'--readnow', '--quiet',"--args" ].concat( cmd );
		
		/* Start the process */
		try
		{
			this.gdb_instance = spawn( "gdb", gdb_args, {detached : true} );
		}
		catch(e)
		{
			console.log("Error launching the gdb child process");
			console.dir(e);
			return 1;
		}
		
		return 0;
	}
	
	/* Write to GDB instance */
	gdbProcessWrapper.prototype.write = function( data )
	{
		try
		{
			this.gdb_instance.stdin.write( data );
		}
		catch(e)
		{
			console.log("Error writing to the gdb instance");
			console.dir(e);
			return 1;
		}
		
		return 0;
	};
	
	/* Send a signal to a PID
	 * This is a workaround as node.js kill
	 * does not work maybe some signal masking... */
	gdbProcessWrapper.prototype.interrupt = function( pid )
	{
		exec("kill -s 2 " + pid);
		return 0;
	};
	
	/* On data call those handlers */
	gdbProcessWrapper.prototype.onData = function (handler)
	{
		this.gdb_instance.stdout.on("data", handler );
		this.gdb_instance.stderr.on("data", handler );
		/* handler( data ) */	
	}
	
	/* On close */
	gdbProcessWrapper.prototype.onClose = function (handler)
	{
		this.gdb_instance.on("close", handler );	
		/* handler( return_code, signal ) */
	}

	/* On error */
	gdbProcessWrapper.prototype.onExit = function (handler)
	{
		this.gdb_instance.on("exit", handler );	
		/* handler(  return_code, signal  ) */
	}
	
	/* On error */
	gdbProcessWrapper.prototype.onError = function (handler)
	{
		this.gdb_instance.on("error", handler );	
		/* handler( error ) */
	}
	
	/* ############################################## */
	/* ############################################## */
	/* Constructor */
	this.gdb_instance = undefined;
	
}

 /*################################################################
  #                        gdbMI instance                         #
  # This is the definition of the gdbMI instance which can be     #
  # used to communicate with a gdb instace through the gdb/MI     #
  # interface. It produces json output and matches commands with  #
  # javascript calls. This module only provide ALL the commands   #
  # of the gdb/MI interface it is not intended for state handling #
  #################################################################*/

var events = require('events');

/* Utility functions */

/* Yes javascript does not handle string subscripts ... */
String.prototype.setCharAt = function(index,chr) {
	if(this.length <= index)
		return str;
	
	return this.substr(0,index) + chr + this.substr(index+1);
}

/* Rebuild string from lines with an offset indicator
 * this is used to rebuild both application and GDB outputs */
function rebuildString( target_array, count )
{
	var ret = "";
	
	if( !target_array )
		throw("No array provided");
	
	if( !count || (target_array.length < count) )
		count = target_array.length;
	
	for( i = (target_array.length - count) ; i < target_array.length ; i++ )
	{
		ret += target_array[i] + "\n";
	}
	
	return ret;
}


/* Remove labels inside arrays this is one of the fixes
 * which has to be applied to GDB output in order
 * to retrieve plain JSON (GDB puts labels in arrays) */
function removeArrayLabels( args )
{
	/* We now have to handle labels inside arrays */

	var t_in_array = [];
	var in_array = 0;
	var i = 0;
	for( i = 0 ; i < args.length ; i++ )
	{
		/* This is a small state handling 
		 * in order to see if we are in an array
		 * and therefore if we have to remove labels */
		if( args[i] == "[" ){
			if ((args[i-1] && args[i-1] === "'") && (args[i+1] && args[i+1] === "'")){
				// if the array symbol is part of a char argument it will be surrounded by single quotes
				// this shouldn't be escaped
			} else {
				t_in_array.push(1);
			}
		}
		
		if( args[i] == "{" ){
			if ((args[i-1] && args[i-1] === "'") && (args[i+1] && args[i+1] === "'")){
				// if the object symbol is part of a char argument it will be surrounded by single quotes
				// this shouldn't be escaped
			} else {
				t_in_array.push(0);
			}
		}
		
		if( args[i] == "]" || args[i] == "}" )
			t_in_array.pop();
		
		/* in_array == 1 if we are in an array =) */
		in_array = t_in_array[ t_in_array.length - 1 ];

		/* If we encounter a ',"' inside an array delete until the '":' or '"=' */
		if( in_array && (args[i] == "," || args[i] == "[") && args[i+1] == "\"" )
		{
			var k = i;
			
			/* Walk the label */
			while( (k < args.length) 
				&& (args[k] != ":")
				&& (args[k] != "=")
				&& (args[k] != "]") )
			{
				k++;
			}
			
			/* if we end on a label end (= or :) then clear it up */
			if(  args[k] == ":" || args[k] == "=" )
			{
				var l;
				
				for( l=(i+1) ; l <= k ; l++ )
				{
					args = args.setCharAt(l,' ');
				}
				
			}
		
			
		}
	}
	
	return args;
}

/*
 * GDBMI commands meta-description
 * 
 * This part is used to decribe commands and their arguments
 * in a compact way. Thus avoiding a redundant definition
 * 
 */

/* This defines a parameter to a GDB/MI command */
function commandParam( name, required, key, has_arg, arg_type, prefix )
{
	
	/* This allows the checking of an argument value against the
	 * list of accepted types */
	commandParam.prototype.check = function( value )
	{
		/* Is a value required ? */
		if( !value || value == "" )
		{
			if( (this.arg_type == "keyAndArg") 
			||  (this.arg_type == "argOnly") )
			{
					throw error("Error you must provide a value to arg " + this.name);
			}
			 
			return;
		}
		
		/* Is there a type requirement ? */
		if( !this.arg_type.length )
			return;
		
		var i = 0;
		
		for( i = 0 ; i < this.arg_type.length ; i++ )
		{
			/* If a type is required is the candidate present ? */
			if( typeof(value) == this.arg_type[i].trim() )
				return;
		}
		
		/* If we are here there was no satisfying candidate */
		throw "Could not find a matching type for argument";
	}
	
	/* Constructor */
	
	/* Name of the argument */
	this.name = name;
	/* Is it compulsory ? */
	this.required = required;
	/* If present define this arg as prefixed by a flag ==>   -[this.key] this.value */
	this.key = key,
	/* Defines how the parameter shall be generated :
	 * 
	 * keyOnly:   -[this.key]
	 * keyAndArg: -[this.key] this.value
	 * argOnly:   -this.value
	 */
	this.has_arg = has_arg;
	
	/* Here we just make sure we have a valid input */
	switch( has_arg )
	{
		case "keyOnly":
		case "keyAndArg":
		case "argOnly":
		break;
		default:
			throw "Bad arg type";
	}
	
	
	/* By default the prefix is a simple space */
	if(!prefix)
		prefix = " ";
	
	/* Prefixing allows the management of more complex cases as the "set"
	 * one where the format is $[P0]=[P1] by overriding the precceding
	 * space */
	this.prefix = prefix;
	
	/* This array allows us to call the check method
	 * which validates an argument value from a list of candidate
	 * types. If [] no check is done */
	if( !arg_type )
		arg_type = [];
	
	this.arg_type = arg_type;	
}

/* This defines a command with a name gdb/mi action and several
 * parameters. This object is also in charge of
 * generating the actual call to the gdb/MI */
function command( name, action_name, params )
{
	/* Generate GDB/MI calls */
	command.prototype.generate = function( args )
	{
		if( typeof(args) != "object" )
			throw "Wrong argument type"
		
		/* By default we send back the action */
		var ret = this.action_name + " ";
		
		/* First check that all compulsory args are satisfied */
		var i;
		
		for( i = 0 ; i < this.params.length ; i++ )
		{
			if( this.params[i].required && !args[ this.params[i].name ] )
			{
				throw "Missing argument " + this.params[i].name + " when calling " + this.name;
			}
		}
		
		/* Now we can generate in order */
		for( i = 0 ; i < this.params.length ; i++ )
		{
			var par = this.params[i];
			var value = args[ par.name ];
			
			if( value )
			{
				par.check( value );
				
				/* Here we add a prefix in order to manage the "set" case */
				if( typeof(value) == "string" )
					value = value.trim();
				
				value = par.prefix + value;
				
				switch( par.has_arg )
				{
					case "keyOnly":
						if( value )
							ret += " " + par.key;
					break;
					case "keyAndArg":
						ret += par.key + value;
					break;
					case "argOnly":
						ret += value;
					break;
					default:
						throw "Bad arg type";
				}	
			}	
		}
		
		return ret;
	}
	
	
	/* ############################################## */
	/* ############################################## */
	/* Constructor */
	if( name == "" || typeof(name) != "string" )
		throw error("Error bad name provided");
	
	this.name = name;
	
	if( action_name == "" || typeof(action_name) != "string" )
		throw error("Error action must be a string");
	
	this.action_name = action_name;

	if( params.length == undefined )
		throw error("Error params must be an array");
	
	this.params = params;
}

/* This object is just in charge of generating the basic GDB
 * function list. It gathers them to allow further calls
 * by name */
function commandList()
{
	/* Here we store all the commands */
	this.commandList = {};
	
	/* Add a new command */
	commandList.prototype.insert = function( command )
	{
		/* Is it already here ? */
		if( this.commandList[ command.name ] )
		{
			throw error("Pushing command " + command.name + " would shadow a previous registration"); 
		}
		
		/* If not insert it */
		this.commandList[command.name] = command ;
	}
	
	/* Here we generate a call by firts retrieving command description
	 * then passing args to the underlying command */
	commandList.prototype.genCall = function( commandName, args )
	{
		var cmd = this.commandList[ commandName ];
		
		if( !cmd )
		{
			throw "Unknown command " + commandName;
		}
		
		if( !args )
		{
			args = {};
		}
		
		if( typeof( args ) != "object" )
			throw "Wrong argument type";
		
		return cmd.generate( args );
	}
	
	/* This was just used to generate the documentation
	 * further development could lead to an online help ? */
	commandList.prototype.dumpCommandList = function()
	{
		var i,j;
		
		/* For each command */
		for( e in this.commandList)
		{
			if( !e )
				continue;
			
			var c = this.commandList[e];	
			
			/* Print its name */
			console.log("***\n");
			console.log("* **" + c.name + "** (" + c.action_name + "):" );
			
			/* For each arg print them */
			for( j = 0 ; j < c.params.length ; j++ )
			{
				var a = c.params[j];
				
				var args_req = "";
				
				if( (a.has_arg == "argOnly")
				||  (a.has_arg == "keyAndArg") )
				{
					args_req = " (value required)"
				}
				else
				{
					args_req = " (Boolean switch)"
				}
				
				if( !a.required )
					console.log("   * **[" + a.name + "]**" + args_req + ":" );
				else
					console.log("   * **" + a.name + "**" + args_req + ":" );
			}
			
			console.log("\n\n");
			
		}
		
		
	}
	
	/* ############################################## */
	/* ############################################## */
	/* Constructor */
	/* Here we declare all GDB/MI commands */

	/*#######################
	# Process management    #
	#######################*/

	this.insert( new command( "execInterrupt" , "-exec-interrupt", [] ) );
	this.insert( new command( "run" , "-exec-run", [] ) );
	this.insert( new command( "step" , "-exec-step", [] ) );
	this.insert( new command( "stepInstruction" , "-exec-step-instruction", [] ) );
	this.insert( new command( "next" , "-exec-next", [] ) );
	this.insert( new command( "jump" , "-exec-jump", 
	[
		new commandParam( "location", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "execUntil" , "-exec-until", 
	[
		new commandParam( "location", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "continue" , "-exec-continue", 
	[
		new commandParam( "id", false, "--thread-group", "keyAndArg", ["string", "number"] )
	] ) );
	this.insert( new command( "finish" , "-exec-finish", [] ) );
	
	/*#######################
	# Breakpointing         #
	#######################*/
	
	this.insert( new command( "breakAfter" , "-break-after", 
	[
		new commandParam( "id", true, "", "argOnly", ["string", "number"] ),
		new commandParam( "count", true, "", "argOnly", ["string", "number"] )
	] ) );	
	this.insert( new command( "breakCommand" , "-break-command", 
	[
		new commandParam( "id", true, "", "argOnly", ["string", "number"] ),
		new commandParam( "command", true, "", "argOnly", ["string"] )
	] ) );	
	this.insert( new command( "breakCondition" , "-break-condition", 
	[
		new commandParam( "id", true, "", "argOnly", ["string", "number"] ),
		new commandParam( "expr", true, "", "argOnly", ["string"] )
	] ) );	
	this.insert( new command( "breakDelete" , "-break-delete", 
	[
		new commandParam( "id", true, "", "argOnly", ["string", "number"] )
	] ) );
	this.insert( new command( "breakDisable" , "-break-disable", 
	[
		new commandParam( "id", true, "", "argOnly", ["string", "number"] )
	] ) );
	this.insert( new command( "breakEnable" , "-break-enable", 
	[
		new commandParam( "id", true, "", "argOnly", ["string", "number"] )
	] ) );
	this.insert( new command( "breakInfo" , "-break-info", 
	[
		new commandParam( "id", true, "", "argOnly", ["string", "number"] )
	] ) );
	this.insert( new command( "breakList" , "-break-list", [] ) );
	this.insert( new command( "breakInsert" , "-break-insert", 
	[
		new commandParam( "temporary", false, "-t", "keyOnly", ["number"] ),
		new commandParam( "hardware", false, "-h", "keyOnly", ["number"] ),
		new commandParam( "force", false, "-f", "keyOnly", ["number"] ),
		new commandParam( "disabled", false, "-d", "keyOnly", ["number"] ),
		new commandParam( "tracepoint", false, "-a", "keyOnly", ["number"] ),
		new commandParam( "condition", false, "-a", "keyAndArg", ["string"] ),
		new commandParam( "ignoreCount", false, "-i", "keyAndArg", ["string", "number"] ),
		new commandParam( "threadId", false, "-p", "keyAndArg", ["string", "number"] ),
		new commandParam( "location", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "dprintf" , "-dprintf-insert", 
	[
		new commandParam( "temporary", false, "-t", "keyOnly", ["number"] ),
		new commandParam( "force", false, "-f", "keyOnly", ["number"] ),
		new commandParam( "disabled", false, "-d", "keyOnly", ["number"] ),
		new commandParam( "condition", false, "-a", "keyAndArg", ["string"] ),
		new commandParam( "ignoreCount", false, "-i", "keyAndArg", ["string", "number"] ),
		new commandParam( "threadId", false, "-p", "keyAndArg", ["string", "number"] ),
		new commandParam( "location", true, "", "argOnly", ["string"] ),
		new commandParam( "format", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "breakPasscount" , "-break-passcount", 
	[
		new commandParam( "id", true, "", "argOnly", ["string", "number"] ),
		new commandParam( "count", true, "", "argOnly", ["string", "number"] )
	] ) );	
	this.insert( new command( "watch" , "-break-watch", 
	[
		new commandParam( "read", false, "-r", "keyOnly", ["number"] ),
		new commandParam( "readWrite", false, "-a", "keyOnly", ["number"] ),
		new commandParam( "location", true, "", "argOnly", ["string"] )
	] ) );
	
	/*#######################
	# Catchpoints           #
	#######################*/
	
	this.insert( new command( "catchLoad" , "-catch-load", 
	[
		new commandParam( "temporary", false, "-t", "keyOnly", ["number"] ),
		new commandParam( "disabled", false, "-d", "keyOnly", ["number"] ),
		new commandParam( "regExp", false, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "catchUnload" , "-catch-unload", 
	[
		new commandParam( "temporary", false, "-t", "keyOnly", ["number"] ),
		new commandParam( "disabled", false, "-d", "keyOnly", ["number"] ),
		new commandParam( "regExp", false, "", "argOnly", ["string"] )
	] ) );
	
	/*#######################
	# Program CTX           #
	#######################*/	
	
	this.insert( new command( "setArg" , "-exec-arguments", 
	[
		new commandParam( "arg", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "setWorkingDirectory" , "-environment-cd", 
	[
		new commandParam( "path", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "setSourcePath" , "-environment-directory", 
	[
		new commandParam( "reset", false, "-r", "keyOnly", ["number"] ),
		new commandParam( "path", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "setObjectPath" , "-environment-path", 
	[
		new commandParam( "reset", false, "-r", "keyOnly", ["number"] ),
		new commandParam( "path", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "pwd" , "-environment-pwd", []));

	/*#######################
	# Thread Management     #
	#######################*/
	
	this.insert( new command( "threadInfo" , "-thread-info", 
	[
		new commandParam( "id", false, "", "argOnly", ["string", "number"] )
	] ) );
	this.insert( new command( "threadListIds" , "-thread-list-ids", []));
	this.insert( new command( "threadSelect" , "-thread-select", 
	[
		new commandParam( "id", true, "", "argOnly", ["string", "number"] )
	] ) );

	/*#######################
	# Frames Management     #
	#######################*/
	
	this.insert( new command( "frame" , "-stack-info-frame", []));
	this.insert( new command( "stackDepth" , "-stack-info-depth", 
	[
		new commandParam( "maxDepth", false, "", "argOnly", ["string", "number"] )
	] ) );
	this.insert( new command( "stackListArguments" , "-stack-list-arguments", 
	[
		new commandParam( "skip", false, "--skip-unavailable", "keyOnly", ["number"] ),
		new commandParam( "print", true, "", "argOnly", ["number"] ),
		new commandParam( "frameBoundaries", false, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "stackListFrames" , "-stack-list-frames", 
	[
		new commandParam( "frameBoundaries", false, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "stackListLocals" , "-stack-list-locals", 
	[
		new commandParam( "skip", false, "--skip-unavailable", "keyOnly", ["number"] ),
		new commandParam( "print", true, "", "argOnly", ["number"] )
	] ) );
	this.insert( new command( "stackListVariables" , "-stack-list-variables", 
	[
		new commandParam( "skip", false, "--skip-unavailable", "keyOnly", ["number"] ),
		new commandParam( "print", true, "", "argOnly", ["number"] )
	] ) );
	this.insert( new command( "frameSelect" , "-stack-select-frame", 
	[
		new commandParam( "id", true, "", "argOnly", ["number","string"] )
	] ) );

	/*#######################
	# Variable Objects      #
	#######################*/
	
	this.insert( new command( "enablePrettyPrinting" , "-enable-pretty-printing", []));
	this.insert( new command( "varCreate" , "-var-create", 
	[
		new commandParam( "name", false, "", "argOnly", ["string"] ),
		new commandParam( "frame", false, "", "argOnly", ["string"] ),
		new commandParam( "expression", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "varDelete" , "-var-delete", 
	[
		new commandParam( "children", false, "-c", "keyOnly", ["number"] ),
		new commandParam( "name", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "varSetFormat" , "-var-set-format", 
	[
		new commandParam( "name", true, "", "argOnly", ["string"] ),
		new commandParam( "format", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "varShowFormat" , "-var-show-format", 
	[
		new commandParam( "name", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "varInfoNumChildren" , "-var-info-num-children", 
	[
		new commandParam( "name", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "varListChildren" , "-var-list-children", 
	[
		new commandParam( "print", false, "", "argOnly", ["number"] ),
		new commandParam( "name", true, "", "argOnly", ["string"] ),
		new commandParam( "from", false, "", "argOnly", ["number"] ),
		new commandParam( "to", false, "", "argOnly", ["number"] )
	] ) );
	this.insert( new command( "varInfoType" , "-var-info-type", 
	[
		new commandParam( "name", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "varInfoExpression" , "-var-info-expression", 
	[
		new commandParam( "name", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "varInfoPathExpression" , "-var-info-path-expression", 
	[
		new commandParam( "name", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "varShowAttributes" , "-var-show-attributes", 
	[
		new commandParam( "name", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "varEvaluateExpression" , "-var-evaluate-expression", 
	[
		new commandParam( "formate", false, "-f", "keyAndArg", ["string"] ),
		new commandParam( "name", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "varAssign" , "-var-assign", 
	[
		new commandParam( "name", true, "", "argOnly", ["string"] ),
		new commandParam( "expression", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "varUpdate" , "-var-update", 
	[
		new commandParam( "print", false, "", "argOnly", ["number"] ),
		new commandParam( "name", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "varSetFrozen" , "-var-set-frozen", 
	[
		new commandParam( "name", true, "", "argOnly", ["string"] ),
		new commandParam( "flag", true, "", "argOnly", ["number"] )
	] ) );
	this.insert( new command( "varSetUpdateRange" , "-var-set-update-range", 
	[
		new commandParam( "name", true, "", "argOnly", ["string"] ),
		new commandParam( "from", true, "", "argOnly", ["number"] ),
		new commandParam( "to", true, "", "argOnly", ["number"] )
	] ) );
	this.insert( new command( "varSetVisualizer" , "-var-set-visualizer", 
	[
		new commandParam( "name", true, "", "argOnly", ["string"] ),
		new commandParam( "visualizer", true, "", "argOnly", ["string"] )
	] ) );

	/*#######################
	# TODO DATA             #
	#######################*/

	/*#######################
	# TODO TRACEPOINT       #
	#######################*/

	/*#######################
	# Symbol query          #
	#######################*/
	
	this.insert( new command( "symbolList" , "-symbol-list-lines", 
	[
		new commandParam( "filename", true, "", "argOnly", ["string"] )
	] ) );

	/*#######################
	# File commands         #
	#######################*/
	
	this.insert( new command( "executableAndSymbols" , "-file-exec-and-symbols", 
	[
		new commandParam( "filename", true, "", "argOnly", ["string"] )
	] ) );	
	this.insert( new command( "executable" , "-file-exec-file", 
	[
		new commandParam( "filename", true, "", "argOnly", ["string"] )
	] ) );	
	this.insert( new command( "symbols" , "-file-symbol-file", 
	[
		new commandParam( "filename", true, "", "argOnly", ["string"] )
	] ) );	
	this.insert( new command( "sourceCtx" , "-file-list-exec-source-file", [] ) );
	this.insert( new command( "listSourceFiles" , "-file-list-exec-source-files", [] ) );
	
	/*#######################
	# Target manipulation   #
	#######################*/	

	this.insert( new command( "attach" , "-target-attach", 
	[
		new commandParam( "target", true, "", "argOnly", ["number","string"] )
	] ) );	
	this.insert( new command( "detach" , "-target-detach", 
	[
		new commandParam( "target", true, "", "argOnly", ["number","string"] )
	] ) );	
	this.insert( new command( "disconnect" , "-target-disconnect", [] ) );
	this.insert( new command( "download" , "-target-download", [] ) );
	this.insert( new command( "targetSelect" , "-target-select", 
	[
		new commandParam( "type", true, "", "argOnly", ["string"] ),
		new commandParam( "param", true, "", "argOnly", ["string"] )
	] ) );
	
	/*######################
	#  TODO FILE TRANSFER  #
	######################*/
	
	/*#######################
	# Support Commands      #
	#######################*/
	
	this.insert( new command( "commandExists" , "-info-gdb-mi-command", 
	[
		new commandParam( "command", true, "", "argOnly", ["string"] )
	] ) );	
	this.insert( new command( "listFeature" , "-list-features", [] ) );
	this.insert( new command( "listTargetFeature" , "-list-target-features", [] ) );

	/*#######################
	# Misc Commands         #
	#######################*/
	
	this.insert( new command( "exit" , "-gdb-exit", [] ) );
	this.insert( new command( "set" , "-gdb-set", 
	[
		new commandParam( "name", true, "", "argOnly", ["string"] , " $"),
		new commandParam( "value", true, "", "argOnly", ["string"], "=" )
	] ) );
	this.insert( new command( "show" , "-target-select", 
	[
		new commandParam( "name", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "version" , "-gdb-version", [] ) );
	this.insert( new command( "listThreadGroups" , "-list-thread-groups", 
	[
		new commandParam( "available", false, "--available", "keyOnly", ["number"] ),
		new commandParam( "recurse", false, "--recurse", "keyOnly", ["number"] ),
		new commandParam( "group", false, "", "argOnly", ["string","number"] )
	] ) );
	this.insert( new command( "os" , "-info-os", 
	[
		new commandParam( "type", false, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "addInferior" , "-add-inferior", [] ) );
	this.insert( new command( "exec" , "-interpreter-exec", 
	[
		new commandParam( "interpreter", true, "", "argOnly", ["string"] , " $"),
		new commandParam( "command", true, "", "argOnly", ["string"], "=" )
	] ) );
	this.insert( new command( "ttySet" , "-inferior-tty-set", 
	[
		new commandParam( "tty", true, "", "argOnly", ["string"] )
	] ) );
	this.insert( new command( "ttyShow" , "-inferior-tty-show", [] ) );
	this.insert( new command( "enableTimings" , "-enable-timings", 
	[
		new commandParam( "value", false, "", "argOnly", ["number"] )
	] ) );
}

/* This is the main gdbmi instance
 * 
 * 	It gathers a commandList and a debugger instance.
 * 
 *  */
function gdbMI( command_and_args, options, gdbWrapper )
{
	/* ############################################## */
	/* ############################################## */	

	/* Wrapper interface */
	gdbMI.prototype.onData = function( data )
	{
		var full_data = this.input_buffer + data;
		this.input_buffer = "";

		/* Is this entry terminated by a \n ? */
		var cr_terminated = (full_data[full_data.length - 1] == '\n' );
		
		var data_array = full_data.split("\n");
		
		if( !cr_terminated )
		{
			/* Push the last entry in the buffer for upcoming completion */
			this.input_buffer = data_array[ data_array.length - 1 ];
			data_array = data_array.slice( 0 , data_array.length - 1 );
		}
		
		/* Push all the lines */
		for( var i = 0 ; i < data_array.length ; i++ )
		{
			data_array[i] = data_array[i].trim();

			if( data_array[i] == "(gdb)" )
				continue;

			this.pushLine( data_array[i] );
		}
		
	}

	gdbMI.prototype.onClose = function( return_code, signal )
	{
		this.emit("close",  return_code, signal);
	}
	
	gdbMI.prototype.onExit = function( return_code, signal )
	{
		this.emit("exit",  return_code, signal);
	}

	gdbMI.prototype.onError = function( error )
	{
		this.emit("gdbError",  error);
	}
	
	/* Option parsing */
	gdbMI.prototype.getOpt = function( name )
	{
		if( !this.opt )
			return undefined;
		
		if( !this.opt[ name ] )
			return undefined;
		
		return this.opt[ name ];
	}
	
	
	/* Line parsing */
	gdbMI.prototype.parseStateArgs = function( args )
	{
		//console.log("££££££ " + args + " £££££" );
		/* This is crazy but GDB almost provides a JSON output */
		args = args.split('col_name').join('col-name');
		args = args.split('nr_cols').join('nr-cols');
		args = args.split('nr_rows').join('nr-rows');
		args = args.split('type_changed').join('type-changed');
		args = args.split('in_scope').join('in-scope');
		args = args.split('has_more').join('has-more');
		args = args.replace(/=/g, "!:");
		args = args.replace(/([a-zA-Z0-9-]*)!:/g, "\"$1\":");
		args = args.split('""').join('');
		//console.log("¢¢¢¢ " + args + " ¢¢¢¢" );

		/* Remove array labels */
		args = removeArrayLabels(args);
		
		/* And wrap in an object */
		args = "{" + args + "}";
		
		var ret = {};
		
		//console.log("$$$$$ " + args + " $$$$$" );
		
		try
		{
			ret = JSON.parse( args );
		}
		catch(e)
		{
			/* We lamentably failed =( */
			console.log('error parsing state (parseStateArgs) '+e);
		}
		
		return ret;
	}
	
	/* Extract the state a the beginning of the line */
	gdbMI.prototype.getState = function( line )
	{
		var m = line.match("^([a-z-]*),");
		
		if( m )
		{
			if( m.length == 2 )
			{
				return  m[1].trim();
			}
			
		}

		/* Couldn't we merge this with the previous one ? */
		var m = line.match("^([a-z-]*)$");
		
		if( m )
		{
			if( m.length == 2 )
			{
				return  m[1].trim();
			}
			
		}
				
		return undefined;
	}
	
	
	gdbMI.prototype.parseState = function( line )
	{
		line = line.trim();

		/* Handle state */
		var state = this.getState( line) ;
		
		if( state )
		{
			this.gdb_state.state = state;
		}

		/* Handle args if present */
		var m = line.match("^[a-z-]*,(.*)");
		if( m )
		{
			if( m.length == 2 )
			{
				this.gdb_state.status = this.parseStateArgs( m[1] );
			}
		}
	}
	
	gdbMI.prototype.callTerminationHandler = function()
	{
		
		if( this.push_back_handler )
		{
			/* We do this as we want to clear the handler
			 * before calling an handler which will possibly
			 * set its own handler */
			var to_call = this.push_back_handler;
			this.push_back_handler = undefined;
			(to_call)( this.gdb_state );
		}

	}
	
	/* This is an helper function which pushes a limitted number
	 * of line in an array, to make it act as a FIFO */
	gdbMI.prototype.pushLineAndTruncate = function( target, line, maxlen, do_cleanup )
	{
		
		if( do_cleanup )
		{
			line=line.trim();
			
			if( line[0] == '"' )
				line = line.slice(1);

			if( line[line.length - 1] == '"' )
				line = line.slice(0,line.length - 1);
			
			line = line.replace(/\\"/g, "\"");
			line = line.replace(/\\n/g, "\n");
		}
		
		target.push( line  );
		target.slice( -maxlen ); 
	}
	
	/* This is line entrance point */
	gdbMI.prototype.pushLine = function( fullline )
	{
		
		if( !fullline.length )
		{
			/* Nothing to do */
			return;
		}
		
		var line_descriptor = fullline[0];
		
		//console.log(fullline);

		var line = fullline.slice(1);
		
		this.parseState( line );

		switch( line_descriptor )
		{			
			/* status-async-output  */
			case "+" : /* Async output progress for slow operations (optionnal) */
			case "=" : /* Async output notify suplementary informations */
			
				/* We need to handle child processes PID as we cannot relieably
				 * forward the interupt signal (or I mised someting.. ) */
				if( this.gdb_state.state == "thread-group-started" )
				{
					if( this.gdb_state.status.pid )
					{
						//console.log("Attached to pid " + this.gdb_state.status.pid );
						this.pid_list.push( this.gdb_state.status.pid );
					}
				}
				
				this.emit("notify", this.gdb_state );
			break;
			
			/*  GDB state */
			case "^" : /*  exec-async-output */
			case "*" : /* Async state change (running, stopped ...) */
			
				/* Before doing anything call the 'ready' handler */
				this.emit("ready", this.gdb_state);

				/* We only call termination handler when we are sure we can enter next command */
				if( this.gdb_state.state != "running" )
					this.callTerminationHandler( this.gdb_state );
				
				if( this.gdb_state.state == "error" )
					this.emit("gdbError", this.gdb_state );
			break;
			
			/* log-stream-output */
			case "&" : /* Messages from GDB internals */
			/* console-stream-output */
			case "~" : /* GDB output as it would be displayed normally */
				this.pushLineAndTruncate( this.gdb_log, line.slice(1), this.gdb_log_max_len, true );
				this.emit("gdb", line );
			break;
			
			/* target-stream-output */
			case "@":
			default:
				/* Basic output from the program */
				
				this.pushLineAndTruncate( this.app_log, line, this.app_log_max_len );
				if( line_descriptor == "@" )
					this.emit("app", line ); // Line stripped of the @
				else
					this.emit("app", fullline ); // No descriptor then full line
		}
	}
	
	/* ***************************************************
	* 
	* Gdb actions
	*
	*****************************************************/
	/* Handlers management */
	gdbMI.prototype.sendcommand = function( command, handler )
	{
		this.gdb_state.state = "command";
		this.gdb_state.status = {};
		
		if( handler && (typeof(handler) != "function") )
		{
			console.log("Handler : ");
			console.dir( handler );
			throw "Supplied argument is not an handler";
		}
		
		this.push_back_handler = handler;
		
		if( command.length )
			this.wrapper.write(command + "\n");
	}

	this.commands = new commandList();
	
	gdbMI.prototype.command = function( name, handler, args )
	{
		var ret = "";
		
		/* Handle the interupt case */
		if( name.trim() == "interrupt" )
		{
			var pid = undefined;
			
			if( args )
				pid = args[ "pid" ];
			
			this.interrupt( pid, handler );
			return;
		}
		/* *************************** */
		
		ret = this.commands.genCall( name, args );
		
		//console.log( ret );
		
		this.sendcommand( ret, handler );
	}

	/* The interrupt action is still handled by gdbMI */
	gdbMI.prototype.interrupt = function (pid, handler)
	{
		   this.sendcommand("", handler );
		   
		   /* Here we send the signal by hand (it seems more reliable)
			* there is maybe a mismatch with node which is mixed up
			* so we retrive the pid upon thread group start in order
			* to kill it later (SIGINT)
			* 
			* TODO find a cleaner versiojn using -process-interrupt ? 
			* 
			* this.command("-exec-interrupt", handler);
			* */
		   var i;

		   for( i = 0 ; i < this.pid_list.length; i++ )
		   {
				   if( !pid )
				   {
						   this.wrapper.interrupt( this.pid_list[i] );
				   }
				   else
				   {
						   /* Make sure that we can only interrupt processes
							* which are in the 'children' thread group list */
						   if( this.pid_list[i] == pid )
						   {
								   this.wrapper.interrupt( this.pid_list[i] );
						   }
				   }
		   }
	}

	
	/*######################*/
	/*######################*/
	/*######################*/
	/*######################*/
	/*######################*/
	/*######################*/
	
	/* Output handling
	 * retrieve last n lines from either gdb 
	 * or the program itself */
	gdbMI.prototype.gdbOutput = function( length )
	{
		return rebuildString( this.gdb_log, length );
	}
	
	gdbMI.prototype.programOutput = function( length )
	{
		return rebuildString( this.app_log, length );	
	}
	

	/* ############################################## */
	/* ############################################## */
	/* Constructor */
	
	/*
	 *  Inherit from EventEmitter
	 */
	
	events.EventEmitter.call(this);
	gdbMI.prototype.__proto__ = events.EventEmitter.prototype;
	
	/*
	 *  gdbWrapper
	 */
	
	if( !gdbWrapper )
	{
		gdbWrapper = gdbProcessWrapper;
	}
	
	this.wrapper = new gdbWrapper();
	
	/* Initialize */
	this.wrapper.init(command_and_args);
	
	/* We use this to tranpoline in the anaonymous handlers
	 * in order to go back to object methods as it is cleaner */
	var pthis = this;
	
	/* Attach wrappers */
	this.wrapper.onData( function( data )
	{
		pthis.onData( data );
	});
	
	this.wrapper.onClose( function( return_code, signal )
	{
		pthis.onClose( return_code, signal );
	});
	this.wrapper.onExit( function( return_code, signal )
	{
		pthis.onExit( return_code, signal );
	});
	this.wrapper.onError( function( error )
	{
		pthis.onError( error );
	});
	
	/*
	 *  gdbMi context
	 */

	/* Option object */
	this.opt = options;
	/* Gdb log */
	this.gdb_log = [];
	this.gdb_log_max_len = 256;

	if( this.getOpt("gdb_log_max_len") )
		this.gdb_log_max_len = this.getOpt("gdb_log_max_len");

	/* Application log */
	this.app_log = [];
	this.app_log_max_len = 256;

	if( this.getOpt("app_log_max_len") )
		this.app_log_max_len = this.getOpt("app_log_max_len");
	
	/* Input buffer
	 * It is used to store incomplete lines as only lines ending with \n
	 * are pushed to the parser otherwise they are stored here until
	 * being terminated by an upcomming call of onData */
	this.input_buffer = "";
	
	/* Running ctx
	 * this is what we update at each step
	 * in this gdbMI implementation */
	this.gdb_state = {};
	this.gdb_state.state = "idle";
	this.gdb_state.status = {};
	
	/* Pid list of target processes when interupting 
	 * this list is built with thread groups notifications */
	this.pid_list = [];
	
	/* Push back handler
	 * This handler is provided by command blocks in order
	 * to signal event completion.*/
	 this.push_back_handler = undefined;
	
}

/* Export the whole thing =) */
module.exports = gdbMI;


