@tool
extends Control


func _process(delta: float) -> void:
	rotation += 4.5 * delta
