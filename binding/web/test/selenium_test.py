#!/usr/bin/python3

import os
import sys
import threading
import time
from argparse import ArgumentParser
from http.server import HTTPServer, SimpleHTTPRequestHandler

from selenium import webdriver
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager


class SimpleHttpServer(threading.Thread):
    def __init__(self, host='localhost', port=4001, path='.'):
        self._base_url = f'http://{host}:{port}'
        self._root_path = path
        self._cwd = os.getcwd()
        self._server = HTTPServer((host, port), SimpleHTTPRequestHandler)
        super().__init__(daemon=True)

    @property
    def base_url(self):
        return self._base_url

    def run(self):
        os.chdir(self._root_path)
        print(f'starting server on port {self._server.server_port}')
        self._server.serve_forever()

    def stop(self):
        os.chdir(self._cwd)
        self._server.shutdown()
        self._server.socket.close()
        print(f'stopping server on port {self._server.server_port}')


def run_unit_test_selenium(url, access_key, absolute_audio_file, language):
    desired_capabilities = DesiredCapabilities.CHROME
    desired_capabilities['goog:loggingPrefs'] = {'browser': 'ALL'}
    opts = Options()
    opts.headless = True
    driver = webdriver.Chrome(ChromeDriverManager().install(), desired_capabilities=desired_capabilities, options=opts)

    driver.get(url)
    assert "unit test" in driver.title

    wait = WebDriverWait(driver, 60)

    driver.find_element(By.ID, "accessKey").clear()
    driver.find_element(By.ID, "language").clear()
    driver.find_element(By.ID, "audioFile").clear()

    driver.find_element(By.ID, "audioFile").send_keys(absolute_audio_file)
    wait.until(EC.visibility_of_element_located((By.ID, "audioLoaded")))

    driver.find_element(By.ID, "accessKey").send_keys(access_key)
    driver.find_element(By.ID, "language").send_keys(language)
    driver.find_element(By.ID, "submit").click()
    wait.until(EC.visibility_of_element_located((By.ID, "testComplete")))

    test_result = 1
    test_message = "Tests failed"
    for entry in driver.get_log('browser'):
        print(entry['message'])
        if 'Test passed!' in entry['message']:
            test_message = "Tests passed"
            test_result = 0

    driver.close()
    print(test_message)
    return test_result


def main():
    parser = ArgumentParser()

    parser.add_argument(
        '--access_key',
        required=True)
    parser.add_argument(
        '--audio_root_path',
        required=True)
    parser.add_argument(
        '--languages',
        nargs='+',
        default=['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt'])

    args = parser.parse_args()

    absolute_audio_root_path = os.path.abspath(args.audio_root_path)

    simple_server = SimpleHttpServer(port=4005, path=os.path.join(os.path.dirname(__file__), '..'))
    test_url = f'{simple_server.base_url}/test/index.html'
    simple_server.start()
    time.sleep(4)

    result = 0
    try:
        for language in args.languages:
            if language == "en":
                extension = ""
            else:
                extension = f"_{language}"
            absolute_audio_file = os.path.join(absolute_audio_root_path, f"multiple_keywords{extension}.wav")
            result = run_unit_test_selenium(test_url, args.access_key, absolute_audio_file, language)
            if result != 0:
                break
    except Exception as e:
        print(e)
        result = 1
    finally:
        simple_server.stop()
        sys.exit(result)


if __name__ == '__main__':
    main()
