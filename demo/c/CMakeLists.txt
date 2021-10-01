cmake_minimum_required(VERSION 3.4)

project(octopus-demo LANGUAGES C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_BUILD_TYPE Release)

add_executable(octopus_index_demo octopus_index_demo.c)
target_include_directories(octopus_index_demo PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/../../include)
if (NOT WIN32)
    target_link_libraries(octopus_index_demo dl)
endif()

add_executable(octopus_search_demo octopus_search_demo.c)
target_include_directories(octopus_search_demo PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/../../include)
if (NOT WIN32)
    target_link_libraries(octopus_search_demo dl)
endif()
