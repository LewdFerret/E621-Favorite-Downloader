extends Control

@onready var username_entry: LineEdit = $Panel/VBoxContainer/HBoxContainer/usernameEntry
@onready var path_entry: LineEdit = $Panel/VBoxContainer/HBoxContainer2/pathEntry
@onready var start_at_index_spin_box: SpinBox = $Panel/VBoxContainer/HBoxContainer3/startAtIndexSpinBox
@onready var remember_input_checkbox: CheckBox = $Panel/VBoxContainer/rememberInputCheckbox
@onready var api_key_entry: LineEdit = $Panel/VBoxContainer/HBoxContainer4/apiKeyEntry

var username: String = ""
var path: String = ""
var api_key: String = ""
var index: int = 0

var favoritesData = {
	"posts": [
	]
}

var ext: String = ""

var req: HTTPRequest
var img_req: HTTPRequest

func _ready() -> void:
	if(FileAccess.file_exists("user://rem.json")):
		var rem = FileAccess.open("user://rem.json", FileAccess.READ)
		if(FileAccess.get_open_error() == OK):
			var s = rem.get_as_text()
			if(s != "" or s != null or s.length() != 0):
				var data = JSON.parse_string(s)
				username = data.get("username")
				username_entry.text = username
				path = data.get("path")
				path_entry.text = path
				api_key = data.get("api_key")
				api_key_entry.text = api_key
				$FileDialog.current_path = path_entry.text
			else:
				printerr("String received from \"user://rem.json\" was invalid.")
		else:
			printerr("Couldn't open \"user://rem.json\"")
	else:
		print("Couldn't find settings...")
		remember_input_checkbox.button_pressed = true

func _on_rich_text_label_meta_clicked(meta: Variant) -> void:
	OS.shell_open(str(meta))

func _on_submit_button_pressed() -> void:
	username = username_entry.text
	path = path_entry.text
	api_key = api_key_entry.text
	$Panel/VBoxContainer/SubmitButton.disabled = true
	remember_input_checkbox.disabled = true
	username_entry.editable = false
	start_at_index_spin_box.editable = false
	api_key_entry.editable = false
	
	if(remember_input_checkbox.button_pressed):
		var rem = FileAccess.open("user://rem.json", FileAccess.WRITE)
		if(FileAccess.get_open_error() == OK):
			rem.store_string(JSON.stringify({
				"username": username,
				"path": path,
				"api_key": api_key
			}))
			rem.close()
		else:
			printerr("Couldn't save settings to \"user://rem.json\"")
	
	req = HTTPRequest.new()
	add_child(req)
	req.request_completed.connect(on_req_completed)
	
	var err = req.request("https://e621.net/favorites.json?login=%s&api_key=%s&limit=%d" % [ username, api_key, start_at_index_spin_box.max_value - 1 ],
	PackedStringArray([
		"User-Agent: Custom/1.0 (by idontknowooooo)"
	]), HTTPClient.METHOD_GET)
	
	if(err != OK):
		printerr("ERR: %s" % [err])
		return

func on_req_completed(_result: int, res_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if(res_code != 200):
		printerr("Received Status Code %d" % [res_code])
		return
	
	if(body.size() == 0 or body == null):
		printerr("Received empty or null body")
		return
	
	favoritesData = JSON.parse_string(body.get_string_from_utf8())
	
	img_req = HTTPRequest.new()
	add_child(img_req)
	img_req.request_completed.connect(on_imgReq_completed)
	var authHeader = "Authorization: Basic {auth}".format({"auth": Marshalls.variant_to_base64("%s:%s" % [username, api_key])})
	var req_headers = PackedStringArray([
		"User-Agent: Custom/1.0 (by idontknowooooo)",
		authHeader
	])
	
	req.queue_free()
	
	$LoadingPopup.max_files = favoritesData.get("posts").size()
	$LoadingPopup.show()
	
	index = start_at_index_spin_box.value
	$LoadingPopup.files_downloaded = index
	
	while(favoritesData.get("posts")[index].get("file").get("url") == null):
		index = index + 1
		$LoadingPopup.files_downloaded = index
	img_req.request(favoritesData.get("posts")[index].get("file").get("url"),
	req_headers, HTTPClient.METHOD_GET)

func on_imgReq_completed(_result: int, res_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if(res_code != 200):
		printerr("Received Status Code %n" % [res_code])
		return
	
	if(body.size() == 0):
		printerr("Received empty body")
		return
	
	if(body == null):
		printerr("Body was null! Skipping...")
		index = index + 1
		img_req.queue_free()
	
		img_req = HTTPRequest.new()
		add_child(img_req)
		img_req.request_completed.connect(on_imgReq_completed)
		var authHeader = "Authorization: Basic {auth}".format({"auth": Marshalls.variant_to_base64("%s:%s" % [username, api_key])})
		var req_headers = PackedStringArray([
			"User-Agent: Custom/1.0 (by idontknowooooo)",
			authHeader
		])
		img_req.request(favoritesData.get("posts")[index].get("file").get("url"),
		req_headers, HTTPClient.METHOD_GET)
		return
	
	ext = favoritesData.get("posts")[index].get("file").get("ext")
	
	var fileName: String = "%s/e621-favorite-%s-%d" % [path, username, index]
	
	match ext:
		"webp":
			fileName = fileName + ".webp"
		"png":
			fileName = fileName + ".png"
		"gif":
			fileName = fileName + ".gif"
		"webm":
			fileName = fileName + ".webm"
		_:
			printerr("Unknown extension \".%s\"" % [ext])
			return
	
	var file = FileAccess.open(fileName, FileAccess.WRITE)
	if(FileAccess.get_open_error() == OK):
		file.store_buffer(body)
		file.close()
	else:
		printerr("Couldn't create \"%s\"" % [fileName])
	
	index = index + 1
	
	$LoadingPopup.file_downloaded()
	
	if(index > $LoadingPopup.max_files or index == -1):
		print("Finished")
		img_req.queue_free()
		$Panel/VBoxContainer/SubmitButton.disabled = false
		remember_input_checkbox.disabled = false
		username_entry.editable = true
		start_at_index_spin_box.editable = true
		api_key_entry.editable = true
		start_at_index_spin_box.value = index - 1 if(index != -1) else 0
		return
	
	img_req.queue_free()
	
	while(favoritesData.get("posts")[index].get("file").get("url") == null):
		index = index + 1
	
	img_req = HTTPRequest.new()
	add_child(img_req)
	img_req.request_completed.connect(on_imgReq_completed)
	var authHeader = "Authorization: Basic {auth}".format({"auth": Marshalls.variant_to_base64("%s:%s" % [username, api_key])})
	var req_headers = PackedStringArray([
		"User-Agent: Custom/1.0 (by idontknowooooo)",
		authHeader
	])
	
	img_req.request(favoritesData.get("posts")[index].get("file").get("url"),
	req_headers, HTTPClient.METHOD_GET)

func _on_file_dialog_dir_selected(dir: String) -> void:
	path = dir

func _on_browse_button_pressed() -> void:
	$FileDialog.show()

func _on_file_dialog_confirmed() -> void:
	path_entry.text = path

func _on_github_btn_pressed() -> void:
	OS.shell_open("https://github.com/LewdFerret/")

func _on_e621_btn_pressed() -> void:
	OS.shell_open("https://e621.net/users/1222369")

func _on_loading_popup_should_cancel() -> void:
	index = -1
	if(img_req != null):
		img_req.cancel_request()
		img_req.queue_free()
	if(req != null):
		req.cancel_request()
		req.queue_free()
	print("Cancelled")
	$Panel/VBoxContainer/SubmitButton.disabled = false
	remember_input_checkbox.disabled = false
	username_entry.editable = true
	start_at_index_spin_box.editable = true
	api_key_entry.editable = true
	start_at_index_spin_box.value = index - 1 if(index != -1) else 0
	return
