#!/bin/python

import requests
import json

from os.path import exists
from os.path import isfile
from os.path import isdir
from os import mkdir

ids_file = "all.txt"
asset_dir = "assets/"
json_dir = "jsons/"
with_assets = False

def getProjectJsonOf(pid):
	if exists(json_dir+pid+".json"):
		print(" Opening local project "+pid)
		if with_assets:
			my_file = open(json_dir+pid+".json", "r")
			text = my_file.read()
			my_file.close()
			return json.loads(text)
	else:
		print(" Downloading project "+pid)
		response = requests.get("https://projects.scratch.mit.edu/"+pid)
		text = response.text
		my_file = open(json_dir+pid+".json", "w");
		my_file.write(text)
		my_file.close()
		if with_assets:
			return json.loads(text)
	return 0


def getAsset(md5ext):
	if exists(asset_dir+md5ext):
		print("     "+md5ext+" [already exists]")
	else:
		print("     "+md5ext+" [downloading...]")
		url = "https://assets.scratch.mit.edu/"+md5ext
		request = requests.get(url)
		my_file = open(asset_dir+md5ext, "wb")
		my_file.write(request.content)
		my_file.close()


def getAssetsOfProject(project_json):
	targets = project_json["targets"]
	if not targets:
		print("   Scratch 2 project [asset downloading not implemented]")
	else:
		for sprite in targets:
			print("   "+sprite["name"])
			getAssetsFromList(sprite["costumes"])
			getAssetsFromList(sprite["sounds"])


def getAssetsFromList(asset_list):
	for asset in asset_list:
		getAsset(asset["md5ext"])

def createMissingThings():
	if not isfile(ids_file):
		print("File "+ids_file+" not found.\nCreate it and put project ids in it.")
		exit(1)
	if not isdir(json_dir):
		print("Directory "+json_dir+" not found. Creating it...")
		mkdir(json_dir)
	if with_assets and not isdir(asset_dir):
		print("Directory "+asset_dir+" not found. Creating it...")
		mkdir(asset_dir)

def main():
	createMissingThings()
	ids_opened_file = open(ids_file, "r")
	ids = ids_opened_file.read().replace("\n", " ").replace("\r", "")
	ids = ids.split(" ")
	for project_id in ids:
		if not project_id.isnumeric():
			continue

		if len(project_id) != 9:
			continue

		project_json = getProjectJsonOf(project_id)
		if with_assets:
			getAssetsOfProject(project_json)
	ids_opened_file.close()

main()
