extends Window

signal shouldCancel()

@export var max_files: int = -1: set = set_max_files, get = get_max_files
@export var files_downloaded: int = 0: set = set_files_downloaded, get = get_files_downloaded
@onready var rich_text_label: RichTextLabel = $RichTextLabel

var done_texture: Texture2D = preload("res://icons/done.svg")

func _ready() -> void:
	rich_text_label.clear()
	rich_text_label.push_font_size(32)
	rich_text_label.append_text("Downloading...\nFile %d/%d" % [files_downloaded, max_files])
	rich_text_label.pop()

func _on_close_requested() -> void:
	if(files_downloaded < max_files):
		return;
	hide()
	max_files = -1
	files_downloaded = 0
	rich_text_label.clear()
	rich_text_label.push_font_size(32)
	rich_text_label.append_text("Downloading...\nFile %d/%d" % [files_downloaded, max_files])
	rich_text_label.pop()

func file_downloaded() -> void:
	files_downloaded = files_downloaded + 1
	rich_text_label.clear()
	rich_text_label.push_font_size(32)
	rich_text_label.append_text("Downloading...\nFile %d/%d" % [files_downloaded, max_files])
	rich_text_label.pop()
	if(files_downloaded >= max_files):
		rich_text_label.clear()
		rich_text_label.push_font_size(32)
		rich_text_label.push_color(Color.DARK_GREEN)
		rich_text_label.append_text("Finished Downloading %d files!" % [files_downloaded])
		rich_text_label.pop()
		rich_text_label.pop()
		$Pivot.set_process(false)
		$Pivot/TextureRect.texture = done_texture

func get_max_files() -> int:
	return max_files

func set_max_files(value: int) -> void:
	max_files = value
	rich_text_label.clear()
	rich_text_label.push_font_size(32)
	rich_text_label.append_text("Downloading...\nFile %d/%d" % [files_downloaded, max_files])
	rich_text_label.pop()

func get_files_downloaded() -> int:
	return files_downloaded

func set_files_downloaded(value: int) -> void:
	files_downloaded = value
	rich_text_label.clear()
	rich_text_label.push_font_size(32)
	rich_text_label.append_text("Downloading...\nFile %d/%d" % [files_downloaded, max_files])
	rich_text_label.pop()

func _on_cancel_button_pressed() -> void:
	shouldCancel.emit()
	hide()
	max_files = -1
	files_downloaded = 0
	rich_text_label.clear()
	rich_text_label.push_font_size(32)
	rich_text_label.append_text("Downloading...\nFile %d/%d" % [files_downloaded, max_files])
	rich_text_label.pop()
